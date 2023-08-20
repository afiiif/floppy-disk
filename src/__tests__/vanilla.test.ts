import { initStore, InitStoreReturn, StoreData } from '../vanilla';

describe('initStore', () => {
  interface TestData extends StoreData {
    counter: number;
    text: string;
  }

  const initialData: TestData = {
    counter: 0,
    text: 'initial text',
  };

  const onFirstSubscribeMock = jest.fn();
  const onSubscribeMock = jest.fn();
  const onUnsubscribeMock = jest.fn();
  const onLastUnsubscribeMock = jest.fn();

  const mockStoreInitializer = jest.fn(() => initialData);

  const options = {
    onFirstSubscribe: onFirstSubscribeMock,
    onSubscribe: onSubscribeMock,
    onUnsubscribe: onUnsubscribeMock,
    onLastUnsubscribe: onLastUnsubscribeMock,
  };

  let store: InitStoreReturn<TestData>;

  beforeEach(() => {
    store = initStore(mockStoreInitializer, options);
  });

  afterEach(() => {
    onFirstSubscribeMock.mockClear();
    onSubscribeMock.mockClear();
    onUnsubscribeMock.mockClear();
    onLastUnsubscribeMock.mockClear();
  });

  it('should initialize the store with initial data', () => {
    expect(store.get()).toEqual(initialData);
  });

  it('should call onFirstSubscribe & onSubscribe when subscriber is added', () => {
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    store.subscribe(subscriber1);
    expect(onFirstSubscribeMock).toHaveBeenCalledWith(initialData);
    expect(onSubscribeMock).toHaveBeenCalledWith(initialData);

    store.subscribe(subscriber2);
    expect(onFirstSubscribeMock).toHaveBeenCalledTimes(1);
    expect(onSubscribeMock).toHaveBeenCalledWith(initialData);
  });

  it('should call onUnsubscribe & onLastUnsubscribe when subscriber is removed', () => {
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    const unsub1 = store.subscribe(subscriber1);
    const unsub2 = store.subscribe(subscriber2);

    unsub1();
    expect(onUnsubscribeMock).toHaveBeenCalledWith(initialData);
    expect(onLastUnsubscribeMock).not.toHaveBeenCalled();

    unsub2();
    expect(onUnsubscribeMock).toHaveBeenCalledWith(initialData);
    expect(onLastUnsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('should update the store data when set is called with partial data', () => {
    store.set({ counter: 1 });
    expect(store.get().counter).toEqual(1);
    expect(store.get().text).toEqual(initialData.text);
  });

  it('should update the store data when set is called with a function', () => {
    store.set((prev) => ({ counter: prev.counter + 3 }));
    expect(store.get().counter).toEqual(3);
    expect(store.get().text).toEqual(initialData.text);
  });

  it('should call subscribers when set is called', () => {
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    store.subscribe(subscriber1);
    store.subscribe(subscriber2);

    store.set({ counter: 2 });
    expect(subscriber1).toHaveBeenCalledWith(store.get());
    expect(subscriber2).toHaveBeenCalledWith(store.get());
  });

  it('should call subscribers with matched dependency when set is called', () => {
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    store.subscribe(subscriber1, (state) => [state.counter]);
    store.subscribe(subscriber2, (state) => [state.text]);

    store.set({ counter: 2 });
    expect(subscriber1).toHaveBeenCalledWith(store.get());
    expect(subscriber2).not.toHaveBeenCalled();

    store.set({ text: 'updated' });
    expect(subscriber1).toHaveBeenCalledTimes(1);
    expect(subscriber2).toHaveBeenCalledTimes(1);
    expect(subscriber2).toHaveBeenCalledWith({ counter: 2, text: 'updated' });
  });

  it('should not call subscribers when silent option is true', () => {
    const subscriber = jest.fn();
    store.subscribe(subscriber);

    store.set({ counter: 1 });
    expect(subscriber).toHaveBeenCalledWith(store.get());

    store.set({ counter: 2 }, true);
    expect(store.get().counter).toEqual(2);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should call intercept', () => {
    store = initStore(mockStoreInitializer, {
      intercept: (nextState, prevState) => {
        return nextState.counter > 2 ? prevState : nextState;
      },
    });

    const subscriber = jest.fn();

    store.subscribe(subscriber);

    store.set({ counter: 2 });
    expect(store.get().counter).toEqual(2);
    expect(subscriber).toHaveBeenCalledWith(store.get());

    store.set({ counter: 3 });
    expect(store.get().counter).toEqual(2);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
