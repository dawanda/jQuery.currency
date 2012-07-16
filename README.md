jQuery.currency Plugin
======================

`jQuery.currency` lets you change currencies on the fly on web pages. Oh yes, it does.


Usage
=====

In order to parse currencies, `jQuery.currency` expects them to be formatted according to this microformat (the order of elements is irrelevant):

```html
<span class="money">
  <abbr class="unit">&euro;</abbr>
  <span class="amount">123.45</span>
  <abbr class="currency" title="EUR"></abbr>
</span>
```

Then, it needs to know the exchange rates with respect to a base currency (by default **EUR**, if not specified). You can set both the rates and the base currency calling `jQuery.currency.configure`:

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

Now you are ready to go. To switch all the currencies in a container element to **USD ($)** just do:

```javascript
jQuery("#my_container").currency("USD")
```

Every currency in `#my_container` will be magically converted to US Dollars. Yo!

Note that `jQuery.currency` won't try to convert what it can't parse: if you have currency with an invalid `amount`, it simply won't be touched. The `currency` and `unit` fields are instead optional: if a currency has a valid `amount` and no `currency`, it is assumed to be the `baseCurrency`.


Changing the microformat
========================

It is very easy to change the microformat if you don't like the default one. Just pass to the `jQuery.currency.configure` method a description of your custom microformat.

The description of the default microformat is the following:

```javascript
{
  selector: "span.money",             // The jQuery selector of the whole microformat
  amount: {
    selector: "span.amount"           // The jQuery selector of the amount. The value is found in the tag's content
  },
  currency: {
    selector: "abbr.currency",        // The jQuery selector of the currency
    value: ["title", "content"]       // The currency value will be searched first in the tag's title attribute, then in the tag's content.
  },
  unit: {
    selector: "abbr.unit",            // The jQuery selector of the unit
    value: ["title", "content"]       // The unit value will be searched first in the tag's title attribute, then in the tag's content.
  }
}
```

As an example, if you want your custom microformat to look like this:

```html
<span class="cash">
  <abbr class="symbol" title="&euro;">&euro;</abbr>
  <span class="number">123.45</span>
  <abbr class="currency" title="EUR"></abbr>
</span>
```

You can set it as the default microformat with:

```javascript
jQuery.currency.configure({
  microformat: {
    selector: "span.cash",            // The jQuery selector of the whole microformat
    amount: {
      selector: "span.number",        // The jQuery selector of the amount
      value: "content"                // The amount value can be found in the tag's content
    },
    currency: {
      selector: "abbr.currency",      // The jQuery selector of the currency
      value: "title"                  // The currency value can be found in the tag's title attribute
    },
    unit: {
      selector: "abbr.symbol",
      value: [ "title", "content" ]   // If 'value' is an array, each location in the array is searched in order.
                                      // In this case, the unit value will be searched first in the title attribute, then
                                      // in the tag's content.
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


Utilities
=========

The `jQuery.currency` object exposes some useful utility methods:

  * `jQuery.currency.getRate( fromCurrency, toCurrency )` returns the exchange rate from `fromCurrency` to `toCurrency` (e.g. `jQuery.currency.getRate( "EUR", "GBP" )`)
  * `jQuery.currency.convert( amount, fromCurrency, toCurrency )` converts `amount` from `fromCurrency` to `toCurrency`
  * `jQuery.currency.getSymbol( currency )` returns the symbol for `currency`
  * `jQuery.currency.getDefaults()` returns an object containing the current default configurations (exchange rates, base currency, symbols, microformat...)
  * `jQuery.currency.parse( $elem, options )` parse `$elem` (which must be a jQuery selection) and parse the currency, returning an object like `{ amount: 10, currency: "EUR", unit: "&euro;", precision: 2 }`. With `option` you can override the default configurations.
  * `jQuery.currency.update( $elem, data, options )` expects `$elem` to be a jQuery selection of one or more microformatted currencies, and updates it according to data (e.g.: `jQuery.currency.update( $('#price'), { amount: 20, currency: "USD", unit: "$", precision: 2 } )`)

## License

Hereby placed under MIT license.