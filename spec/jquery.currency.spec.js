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

describe('jquery.currency.overrideDefaults', function() {
  it('should override default configurations', function() {
    expect( jQuery.currency.overrideDefaults({ foo: "bar" }).foo ).toBe("bar");
    expect( jQuery.currency.getDefaults().foo ).toBe("bar");
  });
});

describe('jquery.currency', function() {
  before(function() {
    this.element = jQuery('<span class="money" data-currency="EUR" data-amount="1234.567">').appendTo(jQuery('body'));
    jQuery.currency.getRate = function() {
      return 1;
    }
  });

  it('should maintain chainability', function() {
    expect( this.element.currency() ).toEqual( this.element );
  });

  it('should not do anything if no rate is found', function() {
    var $copy = jQuery( jQuery.clone( this.element[0] ) );

    this.stub(jQuery.currency, "getRate", function() {
      return null;
    });

    expect( this.element.currency().data() ).toEqual( $copy.data() );
    expect( this.element.currency().html() ).toEqual( $copy.html() );
  });

  it('should call jQuery.currency.convert with the default currency if no data-currency is specified', function() {
    var spy = this.spy();
    this.stub(jQuery.currency, "convert", spy);
    this.element.currency("USD");
    expect( spy ).toHaveBeenCalledWith( 1234.567, jQuery.currency.getDefaults().defaultCurrency, "USD" );
  });

  it('should call jQuery.currency.convert with currency taken from data-currency, if specified', function() {
    var spy = this.spy(),
        elem = jQuery('<span class="money" data-currency="XXX" data-amount="1234.567">');
    this.stub(jQuery.currency, "convert", spy);
    elem.currency("USD");
    expect( spy ).toHaveBeenCalledWith( 1234.567, "XXX", "USD" );
  });

  it('should convert and update data-amount and data-currency to the desired currency', function() {
    this.stub(jQuery.currency, "getRate", function() {
      return 0.123;
    });

    expect( this.element.currency("USD").data( "amount" ) ).toEqual( 1234.567 * 0.123 );
    expect( this.element.currency("USD").data( "currency" ) ).toEqual( "USD" );
  });

  it('should apply the default format', function() {
    expect( this.element.currency("USD").text() ).toEqual( "$ 1234.567 USD" );
  });

  it('should call beforeConvert callback', function() {
    var spy = this.spy();
    this.element.currency("USD", { beforeConvert: spy });
    expect( spy ).toHaveBeenCalledOnce();
  });

  it('should pass the not-yet-converted element to beforeConvert callback', function() {
    var elem = jQuery('<span class="money" data-currency="EUR" data-amount="1234.567">'),
        currency;
    elem.currency("USD", { beforeConvert: function( el ) { currency = jQuery( el ).data("currency") } });
    expect( currency ).toBe("EUR");
  });

  it('should call afterConvert callback', function() {
    var spy = this.spy();
    this.element.currency("USD", { afterConvert: spy });
    expect( spy ).toHaveBeenCalledOnce();
  });

  it('should pass the converted element to afterConvert callback', function() {
    var currency;
    this.element.currency("USD", { afterConvert: function( el ) { currency = jQuery( el ).data("currency") } });
    expect( currency ).toBe("USD");
  });
});
