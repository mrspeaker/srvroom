const rand = s => () => {
  s = Math.sin(s) * 10000;
  return s - Math.floor(s);
};

const randSeed = () => Math.random() * 10000;

export {
  rand,
  randSeed
};
