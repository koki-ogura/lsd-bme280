'use strict';

var i2c = require('i2c');
var sleep = require('sleep');

class bme280 {

    uint16(byte0, byte1) {
	return (byte1 << 8) + byte0;
    }

    sint16(byte0, byte1) {
	var res = (byte1 << 8) + byte0;
	if ((res & 0x8000) == 0x8000) {
	    res = res - 0x10000;
	}
	return res;
    }
    
    sint8(byte0) {
	var res = byte0;
	if ((res & 0x80) == 0x80) {
	    res = res - 0x100;
	}
	return res;
    }
    
    constructor(addr, device) {
	this.wire = new i2c(addr, {device: device});
	this.first = true;
    }

    async_get_data(callback) {
	if (this.first) {
	    this.wire.writeBytes(0xe0, [0xb6], (err) => {});
	    this.wire.writeBytes(0xf2, [0x05], (err) => {});
	    this.wire.writeBytes(0xf4, [0xb4], (err) => {});
	    this.wire.writeBytes(0xf5, [0x00], (err) => {});
	    this.wire.readBytes(0x88, 26, (err, res) => {
		this.dig_T1 = this.uint16(res[0], res[1]);
		this.dig_T2 = this.sint16(res[2], res[3]);
		this.dig_T3 = this.sint16(res[4], res[5]);
		this.dig_P1 = this.uint16(res[6], res[7]);
		this.dig_P2 = this.sint16(res[8], res[9]);
		this.dig_P3 = this.sint16(res[10], res[11]);
		this.dig_P4 = this.sint16(res[12], res[13]);
		this.dig_P5 = this.sint16(res[14], res[15]);
		this.dig_P6 = this.sint16(res[16], res[17]);
		this.dig_P7 = this.sint16(res[18], res[19]);
		this.dig_P8 = this.sint16(res[20], res[21]);
		this.dig_P9 = this.sint16(res[22], res[23]);
		this.dig_H1 = res[25];
		this.wire.readBytes(0xe1, 7, (err, res) => {
		    this.dig_H2 = this.sint16(res[0], res[1]);
		    this.dig_H3 = res[2];
		    this.dig_H4 = (this.sint8(res[3]) * 16) | (res[4] & 0x0f);
		    this.dig_H5 = ((res[4] & 0xf0) >> 4) | (this.sint8(res[5]) * 16);
		    this.dig_H6 = this.sint8(res[6]);
		    this.first = false;
		    //callback(null);
		    this._async_get_data_(callback);
		});
	    });
	}
	else {
	    //callback(null);
	    this._async_get_data_(callback);
	}
    }

    _async_get_data_(callback) {
	this.wire.writeBytes(0xf4, [0xb5], (err) => {});
	sleep.msleep(120);
	this.wire.readBytes(0xf7, 8, (err, res) => {
	    // temp
	    var temp_min = -40;
	    var temp_max = 85;
	    var adc_T = (res[3] << 12) + (res[4] << 4) + (res[5] >> 4);
	    var var1 = ((adc_T) / 16384.0 - (this.dig_T1) / 1024.0) * (this.dig_T2);
	    var var2 = ((adc_T) / 131072.0 - (this.dig_T1) / 8192.0);
	    var2 = (var2 * var2) * (this.dig_T3);
	    var t_fine = (var1 + var2);
	    var temp = (t_fine) / 5120.0;
	    if (temp < temp_min)
		temp = temp_min;
	    else if (temp > temp_max)
		temp = temp_max;

	    // pres
	    var adc_P = (res[0] << 12) + (res[1] << 4) + (res[2] >> 4);
	    var1 = (t_fine/2.0) - 64000.0;
	    var2 = var1 * var1 * (this.dig_P6) / 32768.0;
	    var2 = var2 + var1 * (this.dig_P5) * 2.0;
	    var2 = (var2 / 4.0) + ((this.dig_P4) * 65536.0);
	    var1 = ((this.dig_P3) * var1 * var1 / 524288.0 + (this.dig_P2) * var1) / 524288.0;
	    var1 = (1.0 + var1 / 32768.0) * (this.dig_P1);
	    var pres = 0;
	    if (var1 != 0.0)
	    {
		pres = 1048576.0 - adc_P;
		pres = (pres - (var2 / 4096.0)) * 6250.0 / var1;
		var1 = (this.dig_P9) * pres * pres / 2147483648.0;
		var2 = pres * (this.dig_P8) / 32768.0;
		pres = pres + (var1 + var2 + (this.dig_P7)) / 16.0;
	    }
	    
	    // humi
	    var adc_H = (res[6] << 8) + (res[7]);
            var var1 = (t_fine) - 76800.0;
	    var var2 = ((this.dig_H4) * 64.0 + ((this.dig_H5) / 16384.0) * var1);
	    var var3 = adc_H - var2;
	    var var4 = (this.dig_H2) / 65536.0;
	    var var5 = (1.0 + ((this.dig_H3) / 67108864.0) * var1);
	    var var6 = 1.0 + ((this.dig_H6) / 67108864.0) * var1 * var5;
	    var var6 = var3 * var4 * (var5 * var6);
	    var humi = var6 * (1.0 - (this.dig_H1) * var6 / 524288.0);
	    if (humi > 100.0)
		humi = 100.0;
	    else if (humi < 0.0)
		humi = 0.0;
	    
	    callback(null, {"temp":temp, "pres":pres/100.0, "humi":humi});
	});
    }
}

module.exports = bme280;
