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
            selector: "abbr.currency"
          },
          unit: {
            selector: "abbr.unit"
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

      parse: function( $elem, microformat ) {
        var parseOne = function( key ) {
              var mf = $.extend( {}, defaults.microformat, microformat ),
                  $el = $elem.find( mf[ key ].selector );
              if ( mf[ key ].value && mf[ key ].value !== "content" ) {
                return $elem.data( key ) || $el.attr( mf[ key ].value );
              } else {
                return $elem.data( key ) || $el.html();
              }
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

      update: function( $elem, data, microformat ) {
        var updateOne = function( key, value ) {
          var mf = $.extend( {}, defaults.microformat, microformat ),
              $el = $elem.find( mf[ key ].selector );
          if ( mf[ key ].value && mf[ key ].value !== "content" ) {
            $el.attr( mf[ key ].value, value );
          } else {
            $el.html( value );
          }
        };
        updateOne( "amount", $.currency.formatNumber( data.amount, data.currency ) );
        updateOne( "currency", data.currency );
        updateOne( "unit", data.unit );
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
          data = $.currency.parse( $this, settings.microformat );

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

        $.currency.update( $this, data, settings.microformat );
      
        if ( $.isFunction( settings.afterConvert ) ) {
          settings.afterConvert( self, arguments );
        }
      }
    });
    return this;
  };
})( jQuery );
