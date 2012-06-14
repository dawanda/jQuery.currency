jQuery.currency Plugin
======================

`jQuery.currency` lets you change currencies on the fly on web pages.


Usage
=====

In order to parse currencies, `jQuery.currency` expects them to be formatted according to a microformat:

```html
<span class="money"><abbr class="unit">&euro;</abbr><span class="amount">123.45</span><abbr class="currency">EUR</abbr></span>
```

Then, it needs to know the exchange rates with respect to a base currency (by default EUR, if not specified). You can set both the rates and the base currency calling `jQuery.currency.configure`:

```javascript
jQuery.currency.configure({
  baseCurrency: "EUR",
  rates: {
    "USD": 1.2491,
    "GBP": 0.8032
    // ...and so on, with all the currencies you need
  }
})
```

Now you are ready to go. To switch all the currencies in a container element to USD just do:

```javascript
jQuery("#my_container").currency("USD")
```


Changing the microformat
========================

If you want, you can set a custom microformat. Just call the `jQuery.currency.configure` method with the description of your microformat. For example, if your microformat is this:

```html
<span class="cash"><abbr class="symbol">&euro;</abbr><span class="number">123.45</span><abbr class="currency" title="EUR"></abbr></span>
```

You can set the default microformat with:

```javascript
jQuery.currency.configure({
  microformat: {
    selector: "span.cash",        // The jQuery selector of the whole microformat
    amount: {
      selector: "span.number"     // The jQuery selector of the amount field
    },
    currency: {
      selector: "abbr.currency",  // The jQuery selector of the currency field
      value: "title"              // By default the value is assumed to be in the tag's content. If instead it is found in
                                  // an attribute (title in this case), you can specify it with the value key
    },
    unit: {
      selector: "abbr.symbol"
    }
  }
})
```

Or you can specify a custom microformat just for a particular `jQuery( ... ).currency()` method call with:

```javascript
jQuery("#my_container").currency("USD", {
  microformat: {
    ...   // The microformat description, as shown above
  }
})
```

Callbacks
=========

You can specify `beforeConvert` and `afterConvert` callbacks:

Globally:

```javascript
jQuery.currency.configure({
  beforeConvert: function() { ... },
  afterConvert: function() { ... }
})
```

Just for a single `jQuery( ... ).currency()` method call:

```javascript
jQuery("#my_container").currency("USD", {
  beforeConvert: function() { ... },
  afterConvert: function() { ... }
})
```

They will be called with the microformat html element as the first argument, and an array of all the arguments passed to the `jQuery( ... ).currency()` method call as the second argument.