const rand = s => () => {
  // console.log(s);
  // s = Math.sin(s) * 10000;
  // return s - Math.floor(s);
  s = (s * 9301 + 49297) % 233280;
  return s / 233280;
};

const randSeed = () => (Math.random() * 10000) | 0;

export { rand, randSeed };
