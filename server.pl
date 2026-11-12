#!/usr/bin/perl
# Tiny local web server for the show, using only Perl, which ships with macOS (no installs needed).
# Serves this folder on http://127.0.0.1:<port> (local machine only).
# Usage: perl server.pl [port]
use strict;
use warnings;
use IO::Socket::INET;
use File::Basename qw(dirname);
use Cwd qw(abs_path);

my $port = shift || 8123;
my $root = dirname(abs_path($0));

my %types = (
  html => 'text/html; charset=utf-8', js => 'text/javascript; charset=utf-8',
  css => 'text/css; charset=utf-8', json => 'application/json', svg => 'image/svg+xml',
  png => 'image/png', jpg => 'image/jpeg', jpeg => 'image/jpeg', gif => 'image/gif', webp => 'image/webp',
  mp4 => 'video/mp4', m4v => 'video/mp4', webm => 'video/webm', mov => 'video/quicktime',
  woff2 => 'font/woff2', txt => 'text/plain; charset=utf-8',
);

my $server = IO::Socket::INET->new(
  LocalAddr => '127.0.0.1', LocalPort => $port, Proto => 'tcp', Listen => 32, ReuseAddr => 1,
) or die "Could not start server on port $port: $!\n";

$SIG{CHLD} = 'IGNORE';   # don't leave finished child processes behind
$SIG{PIPE} = 'IGNORE';   # browser closing a connection early is fine

while (my $client = $server->accept) {
  my $pid = fork;
  if (!defined $pid) { close $client; next; }
  if ($pid) { close $client; next; }   # parent: go back to accepting
  close $server;
  handle($client);
  exit 0;
}

sub reply {
  my ($c, $status, $headers, $body) = @_;
  print $c "HTTP/1.1 $status\r\n";
  print $c "$_: $headers->{$_}\r\n" for keys %$headers;
  print $c "Connection: close\r\n\r\n";
  print $c $body if defined $body;
}

sub handle {
  my $c = shift;
  binmode $c;
  my $request = <$c>;
  return unless defined $request;
  my %h;
  while (my $line = <$c>) {
    last if $line =~ /^\r?\n$/;
    $h{lc $1} = $2 if $line =~ /^([^:]+):\s*(.*?)\r?\n$/;
  }
  my ($method, $target) = $request =~ m{^(GET|HEAD)\s+(\S+)};
  return reply($c, '405 Method Not Allowed', { 'Content-Length' => 0 }) unless $method;

  my $path = (split /[?#]/, $target)[0];
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  $path = '/index.html' if $path eq '/';
  return reply($c, '403 Forbidden', { 'Content-Length' => 0 }) if $path =~ /\.\./;
  my $file = $root . $path;
  return reply($c, '404 Not Found', { 'Content-Type' => 'text/plain', 'Content-Length' => 9 }, "Not found")
    unless -f $file && open(my $fh, '<:raw', $file);

  my $size = -s $file;
  my ($ext) = $file =~ /\.([^.\/]+)$/;
  my $type = $types{lc($ext // '')} || 'application/octet-stream';
  my %base = ('Content-Type' => $type, 'Accept-Ranges' => 'bytes', 'Cache-Control' => 'no-cache');

  # Range requests let videos loop and seek properly
  my ($start, $end, $status) = (0, $size - 1, '200 OK');
  if (($h{range} // '') =~ /^bytes=(\d*)-(\d*)$/ && $size > 0) {
    if ($1 eq '') { $start = $size - $2; } else { $start = $1; $end = $2 if $2 ne ''; }
    $start = 0 if $start < 0;
    $end = $size - 1 if $end > $size - 1;
    if ($start > $end) {
      return reply($c, '416 Range Not Satisfiable', { 'Content-Range' => "bytes */$size", 'Content-Length' => 0 });
    }
    $status = '206 Partial Content';
    $base{'Content-Range'} = "bytes $start-$end/$size";
  }
  my $len = $size ? $end - $start + 1 : 0;
  reply($c, $status, { %base, 'Content-Length' => $len });
  return if $method eq 'HEAD' || !$len;

  seek $fh, $start, 0;
  my $left = $len;
  while ($left > 0) {
    my $n = read $fh, my $buf, ($left < 65536 ? $left : 65536);
    last unless $n;
    print $c $buf or last;
    $left -= $n;
  }
  close $fh;
}
