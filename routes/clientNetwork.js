const {
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
} = require('./constants/ipAddress');

/**
 * Reads an IPv4 address in dotted decimal.
 * @param {string} address - The address, such as `203.0.113.7`.
 * @returns {string | undefined} The address with its bytes written without leading zeros, or
 * `undefined` when it is not an IPv4 address.
 */
const parseIpv4 = (address) => {
  const match = IPV4_PATTERN.exec(address);
  if (!match) {
    return undefined;
  }

  const bytes = match.slice(1).map((byte) => Number.parseInt(byte, DECIMAL_RADIX));
  const isEachByteInRange = bytes.every((byte) => byte <= MAX_IPV4_BYTE);

  return isEachByteInRange ? bytes.join(IPV4_BYTE_SEPARATOR) : undefined;
};

/**
 * Reads the 16-bit groups written in one part of an IPv6 address, on one side of its `::`.
 * @param {string} part - The groups, separated by `:`, the last one maybe an IPv4 address.
 * @returns {number[] | undefined} The values of the groups, or `undefined` when one is not valid.
 */
const parseIpv6Groups = (part) => {
  if (part === '') {
    return [];
  }

  const groups = part.split(IPV6_GROUP_SEPARATOR);
  const lastGroup = groups[groups.length - 1];
  const embeddedIpv4 = parseIpv4(lastGroup);
  const hexGroups = embeddedIpv4 ? groups.slice(0, -1) : groups;
  const areGroupsHexadecimal = hexGroups.every((group) => IPV6_GROUP_PATTERN.test(group));
  if (!areGroupsHexadecimal) {
    return undefined;
  }

  const values = hexGroups.map((group) => Number.parseInt(group, HEXADECIMAL_RADIX));
  if (!embeddedIpv4) {
    return values;
  }

  const [first, second, third, fourth] = embeddedIpv4.split(IPV4_BYTE_SEPARATOR).map(Number);

  return [...values, first * BYTE_VALUE_COUNT + second, third * BYTE_VALUE_COUNT + fourth];
};

/**
 * Reads the eight 16-bit groups of an IPv6 address, written in full or with one `::`.
 * @param {string} address - The address in lower case, such as `2001:db8::1`.
 * @returns {number[] | undefined} The eight values, or `undefined` when it is not an IPv6
 * address.
 */
const parseIpv6 = (address) => {
  const parts = address.split(IPV6_ZERO_RUN);
  const [head, tail] = parts;
  const hasZeroRun = tail !== undefined;
  const hasSeveralZeroRuns = parts.length > ZERO_RUN_PART_COUNT;
  // An embedded IPv4 address ends the address, so it never comes before the `::`.
  const hasIpv4BeforeZeroRun = hasZeroRun && head.includes(IPV4_BYTE_SEPARATOR);
  if (hasSeveralZeroRuns || hasIpv4BeforeZeroRun) {
    return undefined;
  }

  const headGroups = parseIpv6Groups(head);
  const tailGroups = hasZeroRun ? parseIpv6Groups(tail) : [];
  if (!headGroups || !tailGroups) {
    return undefined;
  }

  const writtenGroupCount = headGroups.length + tailGroups.length;
  if (!hasZeroRun) {
    return writtenGroupCount === IPV6_GROUP_COUNT ? headGroups : undefined;
  }

  const zeroGroupCount = IPV6_GROUP_COUNT - writtenGroupCount;
  // `::` stands for one zero group at least.
  if (zeroGroupCount < 1) {
    return undefined;
  }

  return [...headGroups, ...Array(zeroGroupCount).fill(0), ...tailGroups];
};

/**
 * Tells whether the groups of an IPv6 address hold an IPv4 address (`::ffff:a.b.c.d`).
 * @param {number[]} groups - The eight groups of the address.
 * @returns {boolean} `true` for an IPv4-mapped address.
 */
const isIpv4Mapped = (groups) => groups
  .slice(0, IPV4_MAPPED_ZERO_GROUP_COUNT)
  .every((group) => group === 0)
  && groups[IPV4_MAPPED_ZERO_GROUP_COUNT] === IPV4_MAPPED_GROUP;

/**
 * Writes the IPv4 address held in the last two groups of an IPv4-mapped IPv6 address.
 * @param {number[]} groups - The eight groups of the address.
 * @returns {string} The IPv4 address, such as `203.0.113.7`.
 */
const formatMappedIpv4 = (groups) => groups
  .slice(-IPV4_GROUP_COUNT)
  .flatMap((group) => [Math.floor(group / BYTE_VALUE_COUNT), group % BYTE_VALUE_COUNT])
  .join(IPV4_BYTE_SEPARATOR);

/**
 * Gives the client network of an IP address: the address itself for IPv4, the /64 prefix for
 * IPv6, and the IPv4 address held by an IPv4-mapped IPv6 address.
 * @param {string} trimmedIp - The address, trimmed and in lower case.
 * @returns {string | undefined} The network, or `undefined` when the value is not an IP address.
 */
const getAddressNetwork = (trimmedIp) => {
  const ipv4 = parseIpv4(trimmedIp);
  if (ipv4) {
    return ipv4;
  }

  const isBracketed = trimmedIp.startsWith('[') && trimmedIp.endsWith(']');
  const unbracketedIp = isBracketed ? trimmedIp.slice(1, -1) : trimmedIp;
  const [address, zone] = unbracketedIp.split(IPV6_ZONE_SEPARATOR);
  const hasEmptyZone = zone === '';
  if (hasEmptyZone) {
    return undefined;
  }

  const groups = parseIpv6(address);
  if (!groups) {
    return undefined;
  }

  if (isIpv4Mapped(groups)) {
    return formatMappedIpv4(groups);
  }

  const networkGroups = groups
    .slice(0, IPV6_NETWORK_GROUP_COUNT)
    .map((group) => group.toString(HEXADECIMAL_RADIX));

  return `${networkGroups.join(IPV6_GROUP_SEPARATOR)}${IPV6_ZERO_RUN}/${IPV6_NETWORK_PREFIX_LENGTH}`;
};

/**
 * Turns the address of a visitor into the key by which the start limit counts the games: its
 * client network. An IPv4 address is its own network. An IPv6 address belongs to its /64 prefix,
 * whatever way it is written (compressed with `::` or in full, in any case, in brackets, with a
 * zone), and an IPv4-mapped IPv6 address to the IPv4 address it holds. A value that is not an
 * address counts by itself, trimmed.
 * @param {unknown} clientIp - The address of the visitor, from the `CF-Connecting-IP` header.
 * @returns {string | undefined} The key, such as `203.0.113.7` or `2001:db8:0:1::/64`, or
 * `undefined` when there is no value: not a string, empty or only spaces.
 * @example
 * getClientNetworkKey('2001:DB8:0:1:aaaa::1'); // '2001:db8:0:1::/64'
 * getClientNetworkKey('::ffff:203.0.113.7'); // '203.0.113.7'
 * getClientNetworkKey(' unknown '); // 'unknown'
 */
const getClientNetworkKey = (clientIp) => {
  if (typeof clientIp !== 'string') {
    return undefined;
  }

  const trimmedValue = clientIp.trim();
  if (trimmedValue === '') {
    return undefined;
  }

  return getAddressNetwork(trimmedValue.toLowerCase()) ?? trimmedValue;
};

module.exports = { getClientNetworkKey };
