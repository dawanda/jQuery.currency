(function($) {
  "use strict";

  var defaults = {
        beforeConvert: false,
        afterConvert: false,
        baseCurrency: "EUR",
        microformat: {
          selector: "span.money",
          amount: {
            selector: "span.amount"
          },
          currency: {
            selector: "abbr.currency",
            value: ["title", "content"]
          },
          unit: {
            selector: "abbr.unit",
            value: ["title", "content"]
          }
        },
        symbols: {
          "ALL": 'Lek',
          "ARS": '$',
          "AWG": 'f',
          "AUD": '$',
          "BSD": '$',
          "BBD": '$',
          "BYR": 'p.',
          "BZD": 'BZ$',
          "BMD": '$',
          "BOB": '$b',
          "BAM": 'KM',
          "BWP": 'P',
          "BRL": 'R$',
          "BND": '$',
          "CAD": '$',
          "KYD": '$',
          "CLP": '$',
          "CNY": '&yen;',
          "COP": '$',
          "CRC": 'c',
          "HRK": 'kn',
          "CZK": 'Kc',
          "DKK": 'kr',
          "DOP": 'RD$',
          "XCD": '$',
          "EGP": '&pound;',
          "SVC": '$',
          "EEK": 'kr',
          "EUR": '&euro;',
          "FKP": '&pound;',
          "FJD": '$',
          "GBP": '&pound;',
          "GHC": 'c',
          "GIP": '&pound;',
          "GTQ": 'Q',
          "GGP": '&pound;',
          "GYD": '$',
          "HNL": 'L',
          "HKD": '$',
          "HUF": 'Ft',
          "ISK": 'kr',
          "IDR": 'Rp',
          "ILS": "&#8362;",
          "IMP": '&pound;',
          "JMD": 'J$',
          "JPY": '&yen;',
          "JEP": '&pound;',
          "LVL": 'Ls',
          "LBP": '&pound;',
          "LRD": '$',
          "LTL": 'Lt',
          "MYR": 'RM',
          "MXN": '$',
          "MZN": 'MT',
          "NAD": '$',
          "ANG": 'f',
          "NZD": '$',
          "NIO": 'C$',
          "NOK": 'kr',
          "PAB": 'B/.',
          "PYG": 'Gs',
          "PEN": 'S/.',
          "PLN": 'zl',
          "RON": 'lei',
          "RUB": "&#1088;&#1091;&#1073;",
          "SHP": '&pound;',
          "SGD": '$',
          "SBD": '$',
          "SOS": 'S',
          "ZAR": 'R',
          "SEK": 'kr',
          "CHF": 'CHF',
          "SRD": '$',
          "SYP": '&pound;',
          "TWD": 'NT$',
          "TTD": 'TT$',
          "TRY": 'TL',
          "TRL": '&pound;',
          "TVD": '$',
          "USD": '$',
          "UYU": '$U',
          "VEF": 'Bs',
          "ZWD": 'Z$'
        },
        rates: {},
        formatNumber: function( number, currency ) {
          return number.toFixed(2);
        }
      };

  $.extend({
    currency: {
      getRate: function( fromCurrency, toCurrency ) {
        var rate1 =  fromCurrency === defaults.baseCurrency ? 1 : defaults.rates[ fromCurrency ],
            rate2 =  toCurrency === defaults.baseCurrency ? 1 : defaults.rates[ toCurrency ];
        if ( rate1 && rate2 ) {
          return rate2 / rate1;
        }
      },

      convert: function( amount, fromCurrency, toCurrency ) {
        var rate = parseFloat( $.currency.getRate( fromCurrency, toCurrency ) );
        return isNaN( rate ) ? false : amount * rate;
      },

      getSymbol: function( currency ) {
        return defaults.symbols[ currency ];
      },

      configure: function( configs ) {
        defaults = $.extend( defaults, configs );
        return defaults;
      },

      getDefaults: function() {
        return defaults;
      },

      parse: function( $elem, options ) {
        var settings = $.extend( {}, defaults, options ),
            parseOne = function( key ) {
              var mf = settings.microformat,
                  $el = $elem.find( mf[ key ].selector ),
                  values = $.isArray( mf[ key ].value ) ? mf[ key ].value : [ mf[ key ].value ],
                  parsed = null;

              if ( $elem.data( key ) ) { return $elem.data( key ); }

              $.each( values, function( idx, value ) {
                if ( value && value !== "content" ) {
                  if ( $el.attr( value ) ) {
                    parsed = $el.attr( value );
                    return false;
                  }
                } else {
                  if ( $el.html() && $el.html().match(/\S/) ) {
                    parsed = $el.html();
                    return false;
                  }
                }
              });

              return parsed;
            },
            amount = parseFloat( parseOne("amount") );
        if ( isNaN( amount ) ) {
          return null;
        } else {
          return {
            amount: amount,
            currency: parseOne("currency"),
            unit: parseOne("unit")
          };
        }
      },

      update: function( $elem, data, options ) {
        var settings = $.extend( {}, defaults, options ),
            updateOne = function( key, value ) {
              var mf = settings.microformat,
                  $el = $elem.find( mf[ key ].selector ),
                  values = $.isArray( mf[ key ].value ) ? mf[ key ].value : [ mf[ key ].value ];

              $.each( values, function( idx, v ) {
                if ( v && v !== "content" && $el.attr( v ) && $el.attr( v ).match(/\S/) ) {
                  $el.attr( v, value );
                } else if ( $el.html() && $el.html().match(/\S/) ) {
                  $el.html( value );
                }
              });
            };
        updateOne( "amount", $.currency.formatNumber( data.amount, data.currency ) );
        if ( data.currency ) { updateOne( "currency", data.currency ); }
        if ( data.currency ) { updateOne( "unit", data.unit ); }
        $elem.data( data );
      },

      formatNumber: defaults.formatNumber
    }
  });

  $.fn.currency = function( currency, options ) {
    var settings = $.extend( {}, settings, defaults, options );

    this.find( settings.microformat.selector ).andSelf().filter( settings.microformat.selector ).each(function() {
      var convertedAmount,
          self = this,
          $this = $( this ),
          data = $.currency.parse( $this, settings );

      convertedAmount = data ? $.currency.convert( data.amount, data.currency || settings.baseCurrency, currency ) : null;

      if ( typeof convertedAmount === "number" ) {
        if ( $.isFunction( settings.beforeConvert ) ) {
          settings.beforeConvert( self, arguments );
        }

        data = {
          amount: convertedAmount,
          currency: currency,
          unit: settings.symbol || $.currency.getSymbol( currency ) || ""
        };

        $.currency.update( $this, data, settings );
      
        if ( $.isFunction( settings.afterConvert ) ) {
          settings.afterConvert( self, arguments );
        }
      }
    });
    return this;
  };
})( jQuery );
