(function($) {
  "use strict";

  var defaults = {
        beforeConvert: false,
        afterConvert: false,
        baseCurrency: "EUR",
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
        rates: {}
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
      formatNumber: function( number ) {
        return number.toFixed(2);
      },
      parse: function( $elem ) {
        var amount = parseFloat( $elem.find(".amount").text() );
        if ( isNaN( amount ) ) {
          return null;
        } else {
          return {
            amount: amount,
            currency: $elem.find(".currency").attr("title") || $elem.find(".currency").text(),
            unit: $elem.find(".unit").text()
          }
        }
      },
      update: function( $elem, data ) {
        $elem.find(".amount").html( $.currency.formatNumber( data.amount ) );
        $elem.find(".currency").html( data.currency ).attr( "title", data.currency );
        $elem.find(".unit").html( data.unit );
        return $elem;
      }
    }
  });

  $.fn.currency = function( currency, options ) {
    return this.each(function() {
      var convertedAmount,
          settings = $.extend( {}, settings, defaults, options ),
          self = this,
          $this = $( this ),
          data = $.currency.parse( $this );

      convertedAmount = data ? $.currency.convert( data.amount, data.currency || settings.baseCurrency, currency ) : null;

      if ( typeof convertedAmount === "number" ) {
        if ( $.isFunction( settings.beforeConvert ) ) {
          settings.beforeConvert( self );
        }

        data = {
          amount: convertedAmount,
          currency: currency,
          unit: settings.symbol || $.currency.getSymbol( currency ) || ""
        };

        $.currency.update( $this, data );
      
        if ( $.isFunction( settings.afterConvert ) ) {
          settings.afterConvert( self );
        }
      }
    });
  };
})( jQuery );
