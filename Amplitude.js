//
//  Copyright 2015 mParticle, Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

(function (window) {
    var MessageType = {
        SessionStart: 1,
        SessionEnd: 2,
        PageView: 3,
        PageEvent: 4,
        CrashReport: 5,
        OptOut: 6,
        Commerce: 16
    },
    name = 'Amplitude';

    var constructor = function () {
        var self = this,
            isInitialized = false,
            forwarderSettings,
            reportingService,
            isTesting = false;

        function getIdentityTypeName(identityType) {
            return mParticle.IdentityType.getName(identityType);
        }

        function processEvent(event) {
            var reportEvent = false;

            if (isInitialized) {
                try {
                    if (event.EventDataType == MessageType.PageView) {
                        reportEvent = true;
                        logPageView(event);
                    }
                    else if(event.EventDataType == MessageType.Commerce) {
                        reportEvent = logCommerce(event);
                    }
                    else if (event.EventDataType == MessageType.PageEvent) {
                        reportEvent = true;

                        if (event.EventCategory == window.mParticle.EventType.Transaction) {
                            logTransaction(event);
                        }
                        else {
                            logEvent(event);
                        }
                    }

                    if (reportEvent && reportingService) {
                        reportingService(self, event);
                    }

                    return 'Successfully sent to ' + name;
                }
                catch (e) {
                    return 'Failed to send to: ' + name + ' ' + e;
                }
            }

            return 'Can\'t send to forwarder ' + name + ', not initialized';
        }

        function setUserIdentity(id, type) {
            if (isInitialized) {
                if (type == window.mParticle.IdentityType.CustomerId) {
                    amplitude.setUserId(id);
                }
                else {
                    setUserAttribute(getIdentityTypeName(type), id);
                }
            }
            else {
                return 'Can\'t call setUserIdentity on forwarder ' + name + ', not initialized';
            }
        }

        function setUserAttribute(key, value) {
            if (isInitialized) {
                try {
                    var attributeDict = {};
                    attributeDict[key] = value;
                    amplitude.setUserProperties(attributeDict);
                    return 'Successfully called setUserProperties API on ' + name;
                }
                catch (e) {
                    return 'Failed to call SET setUserProperties on ' + name + ' ' + e;
                }
            }
            else {
                return 'Can\'t call setUserAttribute on forwarder ' + name + ', not initialized';
            }
        }

        function setOptOut(isOptingOut) {
            if (isInitialized) {
                amplitude.setOptOut(isOptingOut);
            }
            else {
                return 'Can\'t call setOptOut on forwarder ' + name + ', not initialized';
            }
        }

        function logPageView(data) {
            if (data.EventAttributes) {
                amplitude.logEvent("Viewed " + data.EventName, data.EventAttributes);
            }
            else {
                amplitude.logEvent("Viewed " + data.EventName);
            }
        }

        function logEvent(data) {
            if (data.EventAttributes) {
                amplitude.logEvent(data.EventName, data.EventAttributes);
            }
            else {
                amplitude.logEvent(data.EventName);
            }
        }

        function logTransaction(data) {
            if (!data.EventAttributes ||
                !data.EventAttributes.$MethodName ||
                !data.EventAttributes.$MethodName === 'LogEcommerceTransaction') {
                // User didn't use logTransaction method, so just log normally
                logEvent(data);
                return;
            }

            amplitude.logRevenue(
                data.EventAttributes.RevenueAmount,
                data.EventAttributes.ProductQuantity,
                data.EventAttributes.ProductSKU.toString()
            );
        }

        function logCommerce(event) {
            if(event.ProductAction && event.ProductAction.ProductList) {
                event.ProductAction.ProductList.forEach(function(product) {
                    amplitude.logRevenue(
                        product.Price,
                        product.Quantity,
                        product.Sku
                    );
                });

                return true;
            }

            return false;
        }

        function initForwarder(settings, service, testMode) {
            var ampSettings;

            forwarderSettings = settings;
            reportingService = service;
            isTesting = testMode;

            try {
                if(testMode !== true) {
                    (function (e, t) {
                        var r = e.amplitude || {}; var n = t.createElement("script"); n.type = "text/javascript";
                        n.async = true; n.src = "https://d24n15hnbwhuhn.cloudfront.net/libs/amplitude-2.2.1-min.gz.js";
                        var s = t.getElementsByTagName("script")[0]; s.parentNode.insertBefore(n, s); r._q = []; function a(e) {
                            r[e] = function () { r._q.push([e].concat(Array.prototype.slice.call(arguments, 0))) }
                        } var i = ["init", "logEvent", "logRevenue", "setUserId", "setUserProperties", "setOptOut", "setVersionName", "setDomain", "setDeviceId", "setGlobalUserProperties"];
                        for (var o = 0; o < i.length; o++) { a(i[o]) } e.amplitude = r
                    })(window, document);
                }

                ampSettings = {};

                if (forwarderSettings.saveEvents) {
                    ampSettings.saveEvents = forwarderSettings.saveEvents == 'True';
                }

                if (forwarderSettings.savedMaxCount) {
                    ampSettings.savedMaxCount = parseInt(forwarderSettings.savedMaxCount, 10);
                }

                if (forwarderSettings.uploadBatchSize) {
                    ampSettings.uploadBatchSize = parseInt(forwarderSettings.uploadBatchSize, 10);
                }

                if (forwarderSettings.includeUtm) {
                    ampSettings.includeUtm = forwarderSettings.includeUtm == 'True';
                }

                if (forwarderSettings.includeReferrer) {
                    ampSettings.includeReferrer = forwarderSettings.includeReferrer == 'True';
                }

                amplitude.init(forwarderSettings.apiKey, null, ampSettings);
                isInitialized = true;

                return 'Successfully initialized: ' + name;
            }
            catch (e) {
                return 'Failed to initialize: ' + name;
            }
        }

        this.init = initForwarder;
        this.process = processEvent;
        this.setUserIdentity = setUserIdentity;
        this.setUserAttribute = setUserAttribute;
        this.setOptOut = setOptOut;
    };

    if (!window || !window.mParticle || !window.mParticle.addForwarder) {
        return;
    }

    window.mParticle.addForwarder({
        name: name,
        constructor: constructor
    });

})(window);
