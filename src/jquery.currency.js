(function($) {
  "use strict"

  var defaults = {
        format: "%s %a %c",
        beforeConvert: false,
        defaultCurrency: "EUR",
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
        }
      };

  $.extend({
    currency: {
      getRate: function( fromCurrency, toCurrency ) {
        // This is meant to be overridden
      },
      convert: function( amount, fromCurrency, toCurrency ) {
        var rate = parseFloat( $.currency.getRate( fromCurrency, toCurrency ) );
        return isNaN( rate ) ? false : amount * rate;
      },
      getSymbol: function( currency ) {
        return defaults.symbols[ currency ];
      },
      overrideDefaults: function( options ) {
        defaults = $.extend( defaults, options );
        return defaults;
      },
      getDefaults: function() {
        return defaults;
      }
    }
  });

  $.fn.currency = function( currency, options ) {
    return this.each(function() {
      var convertedAmount,
          self = this,
          $this = $( this ),
          data = $this.data();

      options = $.extend( defaults, options );

      convertedAmount = $.currency.convert( data.amount, data.currency || options.defaultCurrency, currency );

      if ( typeof convertedAmount === "number" ) {
        if ( $.isFunction( options.beforeConvert ) ) {
          options.beforeConvert( self );
        }

        $this.data({
          amount: convertedAmount,
          currency: currency
        });

        $this.html( options.format.replace( "%c", currency ).replace( "%a", convertedAmount ).replace( "%s", options.symbol || $.currency.getSymbol( currency ) || "" ) );
      
        if ( $.isFunction( options.afterConvert ) ) {
          options.afterConvert( self );
        }
      }
    });
  };
})( jQuery );
