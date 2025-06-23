const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PADDING_CHARS = BASE62.replace('0', '');

function encodeBase62(num: number): string {
  let encoded = "";

  while (num > 0) {
    encoded = BASE62[num % 62] + encoded;
    num = Math.floor(num / 62);
  }

  while (encoded.length < 8) {
    const randChar = PADDING_CHARS[Math.floor(Math.random() * PADDING_CHARS.length)];
    encoded = randChar + encoded;
  }

  return encoded;
}

export {encodeBase62}