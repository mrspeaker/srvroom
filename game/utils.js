const rand = s => () => {
  s = Math.sin(s) * 10000;
  return s - Math.floor(s);
};

export {
  rand
};
