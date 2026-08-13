export function extractMeasurementsFromName(name) {
  if (!name) return null;

  const normalized = name.replace(/,/g, '.');
  const regex = /\b(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?)?\b/;
  const match = normalized.match(regex);

  if (!match) {
    return null; 
  }

  const result = {};

  const di = parseFloat(match[1]);
  if (!isNaN(di)) result.innerDiameter = di;

  const de = parseFloat(match[2]);
  if (!isNaN(de)) result.outerDiameter = de;

  const alt1 = parseFloat(match[3]);
  if (!isNaN(alt1)) {
    result.height1 = alt1;
    result.thickness = alt1;
  }

  const alt2 = parseFloat(match[4]);
  if (!isNaN(alt2)) {
    result.height2 = alt2;
  }

  return result;
}

console.log(extractMeasurementsFromName('BUFFER 65X80.5X6.3 PU+POM - HBY'));
