# IntersectionObserverExample

This example shows how `IntersectionObserver` can be used to lazy load data for only visible containers.

Scrolling is debounced so only the latest visible containers will trigger data load.

Running it:

```
git clone https://github.com/jaysoo/singular-lazy-data-load-example.git lazy-load-example
cd lazy-load-example
yarn
ng serve example
```

Then navigate to http://localhost:4200.
