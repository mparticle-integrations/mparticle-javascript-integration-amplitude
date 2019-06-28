/* eslint-disable no-undef*/
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

    var isobject = require('isobject');

    var name = 'Amplitude',
        moduleId = 53,
        MessageType = {
            SessionStart: 1,
            SessionEnd: 2,
            PageView: 3,
            PageEvent: 4,
            CrashReport: 5,
            OptOut: 6,
            Commerce: 16
        };

    var constants = {
        MPID: 'mpId'
    };

    var constructor = function() {
        var self = this,
            isInitialized = false,
            forwarderSettings,
            reportingService,
            isDefaultInstance;

        self.name = name;

        function getInstance() {
            if (isDefaultInstance) {
                return amplitude.getInstance();
            } else {
                return amplitude.getInstance(forwarderSettings.instanceName);
            }
        }

        function getIdentityTypeName(identityType) {
            return mParticle.IdentityType.getName(identityType);
        }

        function processEvent(event) {
            var reportEvent = false;

            if (isInitialized) {
                try {
                    if (event.EventDataType === MessageType.PageView) {
                        reportEvent = true;
                        logPageView(event);
                    }
                    else if (event.EventDataType === MessageType.Commerce) {
                        reportEvent = logCommerce(event);
                    }
                    else if (event.EventDataType === MessageType.PageEvent) {
                        reportEvent = true;

                        if (event.EventCategory === window.mParticle.EventType.Transaction) {
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
                if (type === window.mParticle.IdentityType.CustomerId) {
                    getInstance().setUserId(id);
                }
                else {
                    setUserAttribute(getIdentityTypeName(type), id);
                }
            }
            else {
                return 'Can\'t call setUserIdentity on forwarder ' + name + ', not initialized';
            }
        }

        function onUserIdentified(user) {
            if (isInitialized) {
                if (forwarderSettings.userIdentification === constants.MPID) {
                    getInstance().setUserId(user.getMPID());
                }
            }
            else {
                return 'Can\'t call onUserIdentified on forwarder ' + name + ', not initialized';
            }
        }

        function removeUserAttribute(key) {
            if (isInitialized) {
                if (forwarderSettings.allowUnsetUserAttributes && forwarderSettings.allowUnsetUserAttributes === 'True') {
                    try {
                        var identify = new amplitude.Identify().unset(key);
                        getInstance().identify(identify);

                        return 'Successfully unset Amplitude user property: ' + key;
                    }
                    catch (e) {
                        return 'Failed to call unset on ' + name + ' ' + e;
                    }
                }
            }
            else {
                return 'Can\'t call removeUserAttribute on forwarder ' + name + ', not initialized';
            }
        }

        function setUserAttribute(key, value) {
            if (isInitialized) {
                try {
                    var attributeDict = {};
                    attributeDict[key] = value;
                    getInstance().setUserProperties(attributeDict);

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
                getInstance().setOptOut(isOptingOut);
            }
            else {
                return 'Can\'t call setOptOut on forwarder ' + name + ', not initialized';
            }
        }

        function logPageView(data) {
            if (data.EventAttributes) {
                getInstance().logEvent('Viewed ' + data.EventName, data.EventAttributes);
            }
            else {
                getInstance().logEvent('Viewed ' + data.EventName);
            }
        }

        function logEvent(data) {
            if (data.EventAttributes) {
                getInstance().logEvent(data.EventName, data.EventAttributes);
            }
            else {
                getInstance().logEvent(data.EventName);
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

            getInstance().logRevenue(
                data.EventAttributes.RevenueAmount,
                data.EventAttributes.ProductQuantity,
                data.EventAttributes.ProductSKU.toString()
            );
        }

        function logCommerce(event) {
            if (event.ProductAction){
                var isRefund = event.ProductAction.ProductActionType === mParticle.ProductActionType.Refund;
                var logRevenue = (event.ProductAction.ProductActionType === mParticle.ProductActionType.Purchase) || isRefund;
                var expandedEvents = mParticle.eCommerce.expandCommerceEvent(event);
                expandedEvents.forEach(function(expandedEvt) {
                    // Exclude Totals from the attributes as we log it in the revenue call
                    var updatedAttributes = {};
                    for (var key in expandedEvt.EventAttributes) {
                        if (key !== 'Total Amount' && key !== 'Total Product Amount') {
                            updatedAttributes[key] = expandedEvt.EventAttributes[key];
                        }
                    }

                    // Purchase and Refund events generate an additional 'Total' event
                    if (logRevenue && expandedEvt.EventName.indexOf('Total') > -1){
                        var revenueAmount = (expandedEvt.EventAttributes['Total Amount'] || 0) * (isRefund ? -1 : 1);
                        var revenue = new amplitude.Revenue().setPrice(revenueAmount).setEventProperties(updatedAttributes);
                        getInstance().logRevenueV2(revenue);
                    }
                    else {
                        getInstance().logEvent(expandedEvt.EventName, updatedAttributes);
                    }
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
                if (!window.amplitude) {
                    if (testMode !== true) {
                        /* eslint-disable */
                        (function(e,t){var n=e.amplitude||{_q:[],_iq:{}};var r=t.createElement("script");r.type="text/javascript"
                            ;r.async=true;r.src="https://cdn.amplitude.com/libs/amplitude-4.2.1-min.gz.js"
                            ;r.onload=function(){if(e.amplitude.runQueuedFunctions){e.amplitude.runQueuedFunctions()}else{console.log("[Amplitude] Error: could not load SDK")}}
                            ;var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i);function s(e,t){e.prototype[t]=function(){
                            this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this}}
                            var o=function(){this._q=[];return this}
                            ;var a=["add","append","clearAll","prepend","set","setOnce","unset"]
                            ;for(var u=0;u<a.length;u++){s(o,a[u])}n.Identify=o;var c=function(){this._q=[]
                            ;return this}
                            ;var l=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"]
                            ;for(var p=0;p<l.length;p++){s(c,l[p])}n.Revenue=c
                            ;var d=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId","logEventWithTimestamp","logEventWithGroups","setSessionId","resetSessionId"]
                            ;function v(e){function t(t){e[t]=function(){
                            e._q.push([t].concat(Array.prototype.slice.call(arguments,0)))}}
                            for(var n=0;n<d.length;n++){t(d[n])}}v(n);n.getInstance=function(e){
                            e=(!e||e.length===0?"$default_instance":e).toLowerCase()
                            ;if(!n._iq.hasOwnProperty(e)){n._iq[e]={_q:[]};v(n._iq[e])}return n._iq[e]}
                            ;e.amplitude=n})(window,document);
                        /* eslint-enable */
                    }
                }

                ampSettings = {};

                // allow the client to set custom amplitude init properties
                if (typeof window.AmplitudeInitSettings === 'object' &&
                    window.AmplitudeInitSettings !== null) {
                    ampSettings = window.AmplitudeInitSettings;
                }

                if (forwarderSettings.saveEvents) {
                    ampSettings.saveEvents = forwarderSettings.saveEvents === 'True';
                }

                if (forwarderSettings.savedMaxCount) {
                    ampSettings.savedMaxCount = parseInt(forwarderSettings.savedMaxCount, 10);
                }

                if (forwarderSettings.uploadBatchSize) {
                    ampSettings.uploadBatchSize = parseInt(forwarderSettings.uploadBatchSize, 10);
                }

                if (forwarderSettings.includeUtm) {
                    ampSettings.includeUtm = forwarderSettings.includeUtm === 'True';
                }

                if (forwarderSettings.includeReferrer) {
                    ampSettings.includeReferrer = forwarderSettings.includeReferrer === 'True';
                }

                if (forwarderSettings.forceHttps) {
                    ampSettings.forceHttps = forwarderSettings.forceHttps === 'True';
                }

                isDefaultInstance = (!forwarderSettings.instanceName || forwarderSettings.instanceName === 'default');

                getInstance().init(forwarderSettings.apiKey, null, ampSettings);
                isInitialized = true;

                if (forwarderSettings.userIdentification === constants.MPID) {
                    if (window.mParticle && window.mParticle.Identity) {
                        user = window.mParticle.Identity.getCurrentUser();
                        if (user) {
                            userId = user.getMPID();
                            getInstance().setUserId(userId);
                        }
                    }
                }

                return 'Successfully initialized: ' + name;
            }
            catch (e) {
                return 'Failed to initialize: ' + name;
            }
        }

        this.init = initForwarder;
        this.process = processEvent;
        this.setUserIdentity = setUserIdentity;
        this.onUserIdentified = onUserIdentified;
        this.setUserAttribute = setUserAttribute;
        this.setOptOut = setOptOut;
        this.removeUserAttribute = removeUserAttribute;
    };

    function getId() {
        return moduleId;
    }

    function register(config) {
        if (!config) {
            window.console.log('You must pass a config object to register the kit ' + name);
            return;
        }

        if (!isobject(config)) {
            window.console.log('\'config\' must be an object. You passed in a ' + typeof config);
            return;
        }
        
        if (isobject(config.kits)) {
            config.kits[name] = {
                constructor: constructor
            };
        } else {
            config.kits = {};
            config.kits[name] = {
                constructor: constructor
            };
        }
        window.console.log('Successfully registered ' + name + ' to your mParticle configuration');
    }

    if (window && window.mParticle && window.mParticle.addForwarder) {
        window.mParticle.addForwarder({
            name: name,
            constructor: constructor,
            getId: getId
        });
    }

    module.exports = {
        register: register
    };