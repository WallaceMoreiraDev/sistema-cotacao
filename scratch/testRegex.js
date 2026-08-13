const name = "GAXETA 75X85X11,5 UIP2 UB913/////-L";
const normalized = name.replace(/,/g, '.');
const regex = /\b(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*[xX*]\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?)?\b/;
console.log(normalized.match(regex));
