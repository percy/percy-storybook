export default function getMinimumHeight(minimumHeightString) {
  if (!(/^[0-9]*$/.test(minimumHeightString))) {
    throw new Error(
            `Minimum Height must be an integer. Received: ${minimumHeightString}`,
        );
  }

  return parseInt(minimumHeightString, 10);
}
