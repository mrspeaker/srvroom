// TODO: seeded rand.
export default function rand (min, max) {
  return Math.random() * (max - min) + min;
}
