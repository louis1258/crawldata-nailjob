function parseAddressInfo(raw) {
  const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);

  let address = null, city = null, state = null, zipcode = null, phone = null;

  if (lines.length >= 2) {
    address = lines[0];

    const cityStateZip = lines[1];
    const match = cityStateZip.match(/^(.*),\s*([A-Z]{2})\s*(\d{5})$/);

    if (match) {
      city = match[1].trim();
      state = match[2];
      zipcode = match[3];
    }

    if (lines.length >= 3) {
      phone = lines[2];
    }
  }

  return { address, city, state, zipcode, phone };
}


module.exports = parseAddressInfo;
