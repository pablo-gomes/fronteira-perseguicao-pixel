type CameraModalListener = (isOpen: boolean) => void;

let modalOpen = false;
const listeners = new Set<CameraModalListener>();

export const cameraModal = {
  isOpen: () => modalOpen,
  open: () => {
    modalOpen = true;
    listeners.forEach((fn) => fn(true));
  },
  close: () => {
    modalOpen = false;
    listeners.forEach((fn) => fn(false));
  },
  subscribe: (fn: CameraModalListener) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
