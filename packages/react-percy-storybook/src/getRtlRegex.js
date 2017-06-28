export default function getRtlRegex(rtl, rtlRegex) {
  if (rtl && rtlRegex) {
    throw new Error('rtl and rtl_regex were both provided. Please use only one of these.');
  }

    // If rtl is set, match all story names
  if (rtl) {
    return /.*/gim;
  }

  if (rtlRegex) {
    return new RegExp(rtlRegex);
  }

  return null;
}
