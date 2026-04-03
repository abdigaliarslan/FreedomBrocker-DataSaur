function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

interface QueueInterface<T> {
    push(item: T): void;
    pop(): T | undefined;
    getValue(): T[];
}

class Queue<T> implements QueueInterface<T> {
    private items: T[] = [];

    push(item: T): void {
        this.items.push(item);
    }

    pop(): T | undefined {
        return this.items.shift();
    }

    getValue(): T[] {
        return this.items;
    }
}

export { Queue, getProperty };
