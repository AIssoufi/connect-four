import { describe, it, expect } from 'vitest';
import { getClientNetworkKey } from './clientNetwork';

describe('getClientNetworkKey', () => {
  it.each([
    ['an IPv4 address', '203.0.113.7', '203.0.113.7'],
    ['the lowest IPv4 address', '0.0.0.0', '0.0.0.0'],
    ['the highest IPv4 address', '255.255.255.255', '255.255.255.255'],
    ['an IPv4 address with leading zeros', '203.000.113.007', '203.0.113.7'],
    ['an IPv4 address with spaces around it', ' 203.0.113.7 ', '203.0.113.7'],
    ['a full IPv6 address', '2001:0db8:0000:0001:aaaa:bbbb:cccc:dddd', '2001:db8:0:1::/64'],
    ['a compressed IPv6 address', '2001:db8:0:1::1', '2001:db8:0:1::/64'],
    ['an IPv6 address compressed in its prefix', '2001:db8::1', '2001:db8:0:0::/64'],
    ['an IPv6 address in capitals', '2001:DB8:0:1::ABCD', '2001:db8:0:1::/64'],
    ['an IPv6 address compressed at its end', '2001:db8:0:1::', '2001:db8:0:1::/64'],
    ['an IPv6 address compressed at its start', '::1', '0:0:0:0::/64'],
    ['the unspecified IPv6 address', '::', '0:0:0:0::/64'],
    ['an IPv6 address in brackets', '[2001:db8:0:1::1]', '2001:db8:0:1::/64'],
    ['an IPv6 address with a zone', 'fe80::1%eth0', 'fe80:0:0:0::/64'],
    ['an IPv6 address in brackets with a zone', '[fe80::1%25eth0]', 'fe80:0:0:0::/64'],
    ['an IPv4-mapped IPv6 address', '::ffff:203.0.113.7', '203.0.113.7'],
    ['an IPv4-mapped IPv6 address in hexadecimal', '::ffff:cb00:7107', '203.0.113.7'],
    ['an IPv4-mapped IPv6 address in full', '0:0:0:0:0:ffff:203.0.113.7', '203.0.113.7'],
    ['an IPv6 address ending with an IPv4 address', '64:ff9b::203.0.113.7', '64:ff9b:0:0::/64'],
  ])('keys %s', (_case, clientIp, key) => {
    expect(getClientNetworkKey(clientIp)).toBe(key);
  });

  it('gives two IPv6 addresses of one /64 network the same key', () => {
    expect(getClientNetworkKey('2001:db8:0:1::1'))
      .toBe(getClientNetworkKey('2001:db8:0:1:ffff:ffff:ffff:ffff'));
  });

  it('gives two IPv6 addresses of neighbor /64 networks different keys', () => {
    expect(getClientNetworkKey('2001:db8:0:1::1'))
      .not.toBe(getClientNetworkKey('2001:db8:0:2::1'));
  });

  it('gives the compressed and the full forms of one address the same key', () => {
    expect(getClientNetworkKey('2001:db8::1'))
      .toBe(getClientNetworkKey('2001:0db8:0000:0000:0000:0000:0000:0001'));
  });

  it.each([
    ['no address', undefined],
    ['null', null],
    ['an empty address', ''],
    ['spaces', '   '],
    ['a number', 3405803783],
    ['a list of addresses', ['203.0.113.7']],
  ])('gives no key to %s', (_case, clientIp) => {
    expect(getClientNetworkKey(clientIp)).toBeUndefined();
  });

  it.each([
    ['a word', 'localhost'],
    ['an IPv4 address with a byte over 255', '203.0.113.256'],
    ['an IPv4 address with three bytes', '203.0.113'],
    ['an IPv4 address with five bytes', '203.0.113.7.1'],
    ['an IPv4 address with a port', '203.0.113.7:443'],
    ['an IPv4 address with a zone', '203.0.113.7%eth0'],
    ['an IPv6 address with seven groups', '2001:db8:0:1:2:3:4'],
    ['an IPv6 address with nine groups', '2001:db8:0:1:2:3:4:5:6'],
    ['an IPv6 address with two zero runs', '2001::1::2'],
    ['an IPv6 address with a zero run and eight groups', '2001:db8:0:1:2:3:4::5'],
    ['an IPv6 address with three colons', '2001:::1'],
    ['an IPv6 address with a group of five digits', '2001:db8:0:1::12345'],
    ['an IPv6 address with a letter that is not hexadecimal', '2001:db8:0:1::g'],
    ['an IPv6 address with an IPv4 address before its zero run', '203.0.113.7::1'],
    ['an IPv6 address with an IPv4 address in its middle', '::203.0.113.7:1'],
    ['an IPv6 address in brackets with a port', '[2001:db8::1]:443'],
    ['an IPv6 address with one bracket', '[2001:db8::1'],
    ['an IPv6 network', '2001:db8::/64'],
    ['an IPv6 address with an empty zone', '2001:db8::1%'],
    ['an IPv4 address in brackets', '[203.0.113.7]'],
  ])('keys %s by itself', (_case, clientIp) => {
    expect(getClientNetworkKey(clientIp)).toBe(clientIp);
  });

  it('keys a value that is not an address by itself, trimmed and in its own case', () => {
    expect(getClientNetworkKey(' Unknown ')).toBe('Unknown');
  });
});
