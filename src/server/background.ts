export function inBackground(name: string, task: Promise<unknown>) {
  void task.catch((err) => console.error(`${name}:`, err));
}
