# lsd-bme280
bme280 sensor module for node.js (node-red)

## general install
```
# npm -g install lsd-bme280
```

## test program
```test.js
var sleep = require('sleep');
var async = require('async');
var BME280 = require('lsd-bme280');

var bme280 = new BME280(0x76, '/dev/i2c-2');

async.forever(
    (callback) => {
        bme280.async_get_data((err, res) => {
            console.log(res);
            sleep.msleep(1000);
            callback(null);
        });
    }
);
```

## setup for node-red
edit /root/.node-red/settings.js

```
    functionGlobalContext: {
        bme280:require('lsd-bme280')
        // os:require('os'),
        // octalbonescript:require('octalbonescript'),
        // jfive:require("johnny-five"),
        // j5board:require("johnny-five").Board({repl:false})
    },
```

and Reboot

```
# reboot
```

## node-red's function
```node.js
var bme280 = context.get('bme280');
if (!bme280) {
    var BME280 = global.get('bme280');
    context.set(
        'bme280',
        new BME280(0x76, '/dev/i2c-2')
    );
    bme280 = context.get('bme280')
}
bme280.async_get_data((err, res) => {
    var msg = {}
    msg.payload = res;
    node.send(msg);
})
return null;
```

