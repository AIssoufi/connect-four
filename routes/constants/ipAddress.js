/** An IPv4 address in dotted decimal: four groups of one to three digits. */
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Separator of the bytes of an IPv4 address. */
const IPV4_BYTE_SEPARATOR = '.';

/** Largest value of one byte of an IPv4 address. */
const MAX_IPV4_BYTE = 255;

/** Values that one byte holds, to split a 16-bit group of an IPv6 address into two bytes. */
const BYTE_VALUE_COUNT = 256;

/** One 16-bit group of an IPv6 address, in one to four hexadecimal digits. */
const IPV6_GROUP_PATTERN = /^[0-9a-f]{1,4}$/;

/** Groups of 16 bits in an IPv6 address. */
const IPV6_GROUP_COUNT = 8;

/** Groups of the /64 prefix of an IPv6 address, the network of one client. */
const IPV6_NETWORK_GROUP_COUNT = 4;

/** Bits in one group of an IPv6 address. */
const IPV6_GROUP_BIT_COUNT = 16;

/** Length in bits of the prefix of `IPV6_NETWORK_GROUP_COUNT` groups: 64. */
const IPV6_NETWORK_PREFIX_LENGTH = IPV6_NETWORK_GROUP_COUNT * IPV6_GROUP_BIT_COUNT;

/** Groups of an IPv6 address that hold an IPv4 address, its last two. */
const IPV4_GROUP_COUNT = 2;

/** Groups set to 0 before the `ffff` group of an IPv4-mapped IPv6 address (`::ffff:a.b.c.d`). */
const IPV4_MAPPED_ZERO_GROUP_COUNT = 5;

/** The group after the zeros of an IPv4-mapped IPv6 address. */
const IPV4_MAPPED_GROUP = 0xffff;

/** Separator of the groups of an IPv6 address. */
const IPV6_GROUP_SEPARATOR = ':';

/** The run of zero groups that an IPv6 address may compress, once at most. */
const IPV6_ZERO_RUN = '::';

/** Parts of an IPv6 address split at its `::`: the groups before it and the groups after it. */
const ZERO_RUN_PART_COUNT = 2;

/** Start of the zone of an IPv6 address (`fe80::1%eth0`), which names a local interface. */
const IPV6_ZONE_SEPARATOR = '%';

/** Base of the bytes of an IPv4 address. */
const DECIMAL_RADIX = 10;

/** Base of the groups of an IPv6 address. */
const HEXADECIMAL_RADIX = 16;

module.exports = {
  IPV4_PATTERN,
  IPV4_BYTE_SEPARATOR,
  MAX_IPV4_BYTE,
  BYTE_VALUE_COUNT,
  IPV6_GROUP_PATTERN,
  IPV6_GROUP_COUNT,
  IPV6_NETWORK_GROUP_COUNT,
  IPV6_NETWORK_PREFIX_LENGTH,
  IPV4_GROUP_COUNT,
  IPV4_MAPPED_ZERO_GROUP_COUNT,
  IPV4_MAPPED_GROUP,
  IPV6_GROUP_SEPARATOR,
  IPV6_ZERO_RUN,
  ZERO_RUN_PART_COUNT,
  IPV6_ZONE_SEPARATOR,
  DECIMAL_RADIX,
  HEXADECIMAL_RADIX,
};
