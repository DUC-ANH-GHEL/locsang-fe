type Subscriber = (count: number) => void;

let count = 0;
const subscribers = new Set<Subscriber>();

const notify = () => {
  for (const fn of subscribers) fn(count);
};

export const globalLoadingManager = {
  start() {
    count += 1;
    notify();
  },
  stop() {
    count = Math.max(0, count - 1);
    notify();
  },
  reset() {
    count = 0;
    notify();
  },
  getCount() {
    return count;
  },
  subscribe(fn: Subscriber) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
};
