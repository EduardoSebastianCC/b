// ==UserScript==
// @name         COTP BOT V3.2
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  try to take over the world!
// @author       You
// @match        https://cotps.com/trade
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.0/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @icon         https://www.google.com/s2/favicons?domain=cotps.com
// @run-at      document-idle
// @grant        none
// ==/UserScript==
$(document).ready(function() {

    var elementosACargar = ['div', 'span', 'button'],
        elementosCargados = false, // [divs, spans, buttons],
        vecesRevisados = 0,
        maxVeces = 20; //

    // Si la web está más 8 minutos, es porque huno algún error, por tanto recargamos la web.
     function checkForError() {
       comenzarContadorConsola(8, 'Tiempo chequeo de error:', false);
    }

    checkForError(); // El contador comienza automáticamente.

    function comenzarContadorConsola(tiempo, addtext = '', seconds = true) {

        var factor = !seconds ? 60 : 1;

        var contadorInterval = setInterval(function() {

            if ((tiempo -= 1) == 0) {
                // Actualizar el Wallet mediante la recarga de la página.
                window.location.reload();
            }
            //console.log(addtext + ' ' + (tiempo));

        }, factor * 1000); // cada 1seg o cada 60seg si seconds es false.

    }

    var revisarElementosCargados = setInterval(function() {
        if (elementosCargados) {
            // Dejamos de revisar que los elementos hayan cargado.
            clearInterval(revisarElementosCargados);
            core();
        } else {
            if (vecesRevisados > maxVeces) {
                // Probablemente web lanzó 500 asi que comenzamos el contador, pero un contador de consola, que reinicia la pag en 5 min.
                comenzarContadorConsola(5, '', false);
            }
            vecesRevisados++;
            console.log('Revisando elementos...');
        }
    }, 1000);

    // Se espera que carguen los divs, luego span y luego button para setear elementosCargados = true
    waitForKeyElements(elementosACargar[0], function() {
        waitForKeyElements(elementosACargar[1], function() {
            waitForKeyElements(elementosACargar[2], function() {
                elementosCargados = true;
            }, true);
        }, true);
    }, true);


    function core() { // Aquí ya tenemos todos los botones cargados, asi como el div para el contador y el DOM.

        //console.log('Elementos cargados ! Ejecutando CORE');

        var contador = 0,
            divContadorClasses = '.flex_center.van-col.van-col--6',
            segContador = 30, // segundos para recargar pág.
            botonPedir,
            botonVender,
            botonConfirmar,
            botonCancelar,
            minWallet = 5,
            saldoProcesando,
            importeVender,
            saldoWallet,
            lastSaldoWallet;

        var saldoInsuficiente = false,
            tiempoDeCargaWeb = 2 * 1000; // 2 seg;

        var buscarBotones = (function() {
            var botones = document.getElementsByTagName('button');

            botonPedir = botones[0];
            botonVender = botones[3];
            botonCancelar = botones[2];
            botonConfirmar = botones[4];
        })(); // auto-exec

        function buscarSaldoWallet() {
            var divs = document.getElementsByClassName('van-icon');
            for (var i = 0; i < divs.length; i++) {
                //console.log(divs[i].parentElement.textContent);
                if (divs[i].parentElement.textContent == 'Saldo de Wallet ') {
                    saldoWallet = divs[i].parentElement.parentElement.lastChild.textContent;
                }
            }
        }

        // usamos como flag el nombre de importador para ver si aparece el boton vender
        function buscarImportadorVender() {
            var importador = document.getElementById('app').getElementsByClassName('trade')[0].children.item(3).firstChild.firstChild.children.item(1).children.item(1).textContent;
            return importador;
        }

        // usamos como flag el nro de pedido para ver si aparece el boton confirmar.
        function buscarNroPedido() {
            var nroPedido = document.getElementById('app').getElementsByClassName('trade')[0].children.item(4).firstChild.firstChild.children.item(2).children.item(1).textContent;
            return nroPedido;
        }

        var importadores = [],
            nrosPedidos = [];

        function oneTransaction() {

            console.warn('--------Realizando Transacción--------');

            function tryTransac() {
                botonPedir.click();
                var esperarBotonVender = setInterval(function() {
                    var encontrado = buscarImportadorVender();

                    if (encontrado != "" && importadores.indexOf(encontrado) == -1) {
                        //console.log(' 1. Encontrado el importador: ' + encontrado);
                        botonVender.click();
                        clearInterval(esperarBotonVender);

                        var esperarBotonConfirmar = setInterval(function() {
                            var encontradoNro = buscarNroPedido();

                            if (encontradoNro != "" && nrosPedidos.indexOf(encontradoNro) == -1) {
                                //console.log('      2. Encontrado el pedido: ' + encontradoNro);
                                botonConfirmar.click();
                                clearInterval(esperarBotonConfirmar);
                                importadores.push(encontrado);
                                nrosPedidos.push(encontradoNro);

                                // Esperar al saldo Wallet
                                var esperarSaldoWallet = setInterval(function() {
                                    buscarSaldoWallet();
                                    //console.log('      3. El ultimo saldo wallet obtenido fue: ' + lastSaldoWallet + ' y el saldo actual guardado es: ' + saldoWallet);

                                    // Significa que obtuvimos el saldo wallet ACTUALIZADO y con ese valor actualizado
                                    // recien pasamos a ver si da para + transacs.
                                    if (saldoWallet != lastSaldoWallet) {
                                        lastSaldoWallet = saldoWallet;
                                        clearInterval(esperarSaldoWallet);

                                        if (saldoWallet >= minWallet) {
                                            oneTransaction();
                                        } else {
                                            //console.log("Wallet de " + saldoWallet + " USDT insuficiente para realizar transacciones. Te faltan " + (minWallet - saldoWallet) + " USDT");
                                            comenzarContador(segContador);
                                        }

                                        console.warn('------------------------------------------------------');

                                    }

                                }, 200);

                            } else {
                                //console.log(' 2. Buscando Nro Pedido..');
                            }

                        }, 250);
                    } else {
                        //console.log('      1. Buscando importador...');
                    }

                }, 250);
            }

            tryTransac();

        }

        function comenzarContador(tiempo) {
            $(divContadorClasses).html("<span style='color: black; font-size: 48px !important; font-weight: bold;'>" + tiempo + "</span>");

            var contadorInterval = setInterval(function() {

                $(divContadorClasses).html("<span style='color: black; font-size: 48px !important; font-weight: bold;'>" + (tiempo -= 1) + "</span>");

                if (tiempo == 0) {
                    // Actualizar el Wallet mediante la recarga de la página.
                    window.location.reload();
                }

            }, 1000); // cada 1seg
        }


        setTimeout(function() {
            buscarSaldoWallet();

            lastSaldoWallet = saldoWallet;

            if (saldoWallet < minWallet) {
                //console.warn("[FIRST] Wallet de " + saldoWallet + " USDT insuficiente para realizar transacciones. Te faltan " + (minWallet - saldoWallet) + " USDT");
                comenzarContador(segContador);
            } else {
                oneTransaction();
            }

        }, tiempoDeCargaWeb);


    }

});
