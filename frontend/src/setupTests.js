import "@testing-library/jest-dom/vitest";

function createStorageMock() {
  let store = {};

  return {
    clear() {
      store = {};
    },
    getItem(key) {
      return store[key] || null;
    },
    removeItem(key) {
      delete store[key];
    },
    setItem(key, value) {
      store[key] = String(value);
    },
  };
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: createStorageMock(),
});
