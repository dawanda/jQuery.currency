buster.spec.expose()

describe('jquery.currency.convert', function() {
  it('should return a number if rate is found', function() {
    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    expect(typeof jQuery.currency.convert()).toBe("number");
  });

  it('should return false if no rate is found', function() {
    this.stub(jQuery.currency, "getRate", function() {
      return null;
    });

    expect(jQuery.currency.convert( 10, "EUR", "USD" )).toBe( false );
  });

  it('should convert amounts according to rate given by jQuery.currency.getRate', function() {
    this.stub(jQuery.currency, "getRate", function() {
      return 0.123;
    });

    expect(jQuery.currency.convert( 10, "EUR", "USD" )).toEqual( 10 * 0.123 );
  });
});

describe('jquery.currency.configure', function() {
  it('should override default configurations', function() {
    expect( jQuery.currency.configure({ foo: "bar" }).foo ).toBe("bar");
    expect( jQuery.currency.getDefaults().foo ).toBe("bar");
  });

  it('should merge symbols, not override them', function() {
    var originalSymbols = jQuery.currency.getDefaults().symbols,
        symbols = jQuery.currency.configure({
          symbols: { "ZYX": "zyx" }
        }).symbols;
    expect( symbols ).toEqual( jQuery.extend( originalSymbols, symbols ) );
  });
});

describe('jquery.currency.parse', function() {
  it('should return null if it cannot parse', function() {
    expect( jQuery.currency.parse( jQuery("<span>") ) ).toBe( null );
  });
});

describe('jquery.currency', function() {
  before(function() {
    this.element = jQuery('<span class="money"><abbr class="unit">&euro;</abbr> <span class="amount">1234.56</span> <abbr class="currency" title="EUR">EUR</abbr></span>').appendTo(jQuery('body'));
  });

  it('should maintain chainability', function() {
    expect( this.element.currency() ).toEqual( this.element );
  });

  it('should not do anything if no rate is found', function() {
    var $copy = jQuery( jQuery.clone( this.element[0] ) );

    this.stub(jQuery.currency, "getRate", function() {
      return null;
    });

    expect( this.element.currency().html() ).toEqual( $copy.html() );
  });

  it('should call jQuery.currency.convert with the default fromCurrency if no data-currency is specified', function() {
    var spy = this.spy();

    this.stub(jQuery.currency, "getRate", function() {
      return 2;
    });

    this.stub(jQuery.currency, "convert", spy);
    this.element.currency("USD");
    expect( spy ).toHaveBeenCalledWith( 1234.56, jQuery.currency.getDefaults().baseCurrency, "USD" );
  });

  it('should call jQuery.currency.convert with currency taken from currency microformat, if specified', function() {
    var spy = this.spy(),
        elem = jQuery('<span class="money"><abbr class="unit">&euro;</abbr> <span class="amount">1234.56</span> <abbr class="currency">XXX</abbr></span>');

    this.stub(jQuery.currency, "getRate", function() {
      return 2;
    });

    this.stub(jQuery.currency, "convert", spy);
    elem.currency("USD");
    expect( spy ).toHaveBeenCalledWith( 1234.56, "XXX", "USD" );
  });

  it('should use a custom microformat, if specified', function() {
    var spy = this.spy(),
        elem = jQuery('<span class="cash"><span class="unit">&euro;</span> <span class="value">1234.56</span> <abbr class="currency" title="XXX"></abbr></span>');

    this.stub(jQuery.currency, "getRate", function() {
      return 2;
    });

    this.stub(jQuery.currency, "convert", spy);
    elem.currency("USD", {
      microformat: {
        selector: "span.cash",
        amount: {
          selector: "span.value"
        },
        currency: {
          selector: "abbr.currency",
          value: "title"
        },
        unit: {
          selector: "span.unit"
        }
      }
    });

    expect( spy ).toHaveBeenCalledWith( 1234.56, "XXX", "USD" );
  });

  it('should accept array as the value in microformat', function() {
    var spy = this.spy(),
        elem = jQuery('<span class="money"><abbr class="unit"></abbr> <span class="amount" title="4321"></span> <abbr class="currency" title="YYY">XXX</abbr></span>');

    this.stub(jQuery.currency, "getRate", function() {
      return 2;
    });

    this.stub( jQuery.currency, "convert", spy );

    elem.currency("USD", {
      microformat: {
        selector: "span.money",
        amount: {
          selector: "span.amount",
          value: ["content", "title"]
        },
        currency: {
          selector: "abbr.currency",
          value: ["title", "content"]
        },
        unit: {
          selector: "abbr.unit"
        }
      }
    });

    expect( spy ).toHaveBeenCalledWith( 4321, "YYY", "USD" );
  });

  it('should update the element according to the microformat', function() {
    var elem = jQuery('<span class="money"><abbr class="unit"></abbr> <span class="amount">4321</span> <abbr class="currency" title="XXX"></abbr></span>');

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    elem.currency("USD", {
      microformat: {
        selector: "span.money",
        amount: {
          selector: "span.amount",
          value: ["content", "title"]
        },
        currency: {
          selector: "abbr.currency",
          value: ["content", "title"]
        },
        unit: {
          selector: "abbr.unit"
        }
      }
    });

    expect( elem.find(".amount").html() ).toBe( "4321.00" );
    expect( elem.find(".currency").attr("title") ).toBe( "USD" );
  });

  it('should update the currency to the desired one', function() {
    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    expect( this.element.currency("USD").find(".currency").text() ).toEqual( "USD" );
  });

  it('should update the unit to the one corresponding to the desired currency', function() {
    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    expect( this.element.currency("GBP").find(".unit").html() ).toEqual( jQuery("<span>&pound;</span>").html() );
  });

  it('should maintain the format', function() {
    var elem = jQuery('<span class="money"><abbr class="unit">&euro;</abbr> <span class="amount">1234.56</span> <abbr class="currency" title="EUR"></abbr></span>').appendTo(jQuery('body'));
    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    expect( elem.currency("USD").html() ).toEqual( '<abbr class="unit">$</abbr> <span class="amount">1234.56</span> <abbr class="currency" title="USD"></abbr>' );
  });

  it('should not change default configurations when temporary options are passed', function() {
    var defaults = jQuery.currency.getDefaults();

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    this.element.currency("USD", { format: "<strong>%n %s</strong> (%c)", symbol: "xyz", baseCurrency: "USD" });
    expect( jQuery.currency.getDefaults() ).toEqual( defaults );
  });

  it('should call beforeConvert callback', function() {
    var spy = this.spy();

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    this.element.currency("USD", { beforeConvert: spy });
    expect( spy ).toHaveBeenCalledOnce();
  });

  it('should pass the not-yet-converted element to beforeConvert callback', function() {
    var elem = jQuery('<span class="money"><abbr class="unit">&euro;</abbr> <span class="amount">1234.56</span> <abbr class="currency">EUR</abbr></span>');

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    elem.currency("USD", {
      beforeConvert: function( el ) {
        expect( jQuery( el ).find(".currency").text() ).toBe("EUR");
      }
    });
  });

  it('should call afterConvert callback', function() {
    var spy = this.spy();

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    this.element.currency("USD", { afterConvert: spy });
    expect( spy ).toHaveBeenCalledOnce();
  });

  it('should pass the converted element to afterConvert callback', function() {
    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    this.element.currency("USD", {
      afterConvert: function( el ) {
        expect( jQuery( el ).find(".currency").text() ).toBe("USD");
      }
    });
  });

  it('should convert amounts using the rates provided', function() {
    jQuery.currency.configure({
      rates: {
        "USD": 1.25,
        "GBP": 0.85
      }
    });
    expect( this.element.currency("USD").find(".amount").text() ).toEqual( jQuery.currency.formatAmount( 1234.56 * 1.25 ) + "" );
    expect( this.element.currency("GBP").find(".amount").text() ).toEqual( jQuery.currency.formatAmount( 1234.56 * 0.85 ) + "" );
  });

  it('should not do anything if parse fails', function() {
    var $copy = jQuery( jQuery.clone( this.element[0] ) );

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    this.stub(jQuery.currency, "parse", function() {
      return null;
    });

    expect( this.element.currency("GBP").html() ).toEqual( $copy.html() );
  });

  it('should preserve precision if > 2 decimals', function() {
    var elem1 = jQuery('<span class="money"><abbr class="unit">&euro;</abbr> <span class="amount">12.345</span> <abbr class="currency">EUR</abbr></span>');

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    expect( elem1.currency("GBP").find(".amount").text() ).toEqual( "12.345" );
  });

  it('should have precision of 2 decimals if the original precision is lower than 2', function() {
    var elem = jQuery('<span class="money"><abbr class="unit">&euro;</abbr> <span class="amount">1234.5</span> <abbr class="currency">EUR</abbr></span>');

    this.stub(jQuery.currency, "getRate", function() {
      return 1;
    });

    expect( elem.currency("GBP").find(".amount").text() ).toEqual( "1234.50" );
  });
});
