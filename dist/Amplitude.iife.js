var mpAmplitudeKit = (function (exports) {
  /*!
   * isobject <https://github.com/jonschlinkert/isobject>
   *
   * Copyright (c) 2014-2017, Jon Schlinkert.
   * Released under the MIT License.
   */

  function isObject(val) {
    return val != null && typeof val === 'object' && Array.isArray(val) === false;
  }

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



  var name = 'Amplitude',
      moduleId = 53,
      MessageType = {
          SessionStart: 1,
          SessionEnd: 2,
          PageView: 3,
          PageEvent: 4,
          CrashReport: 5,
          OptOut: 6,
          Commerce: 16,
      };

  var constants = {
      MPID: 'mpId',
      customerId: 'customerId',
      email: 'email',
      other: 'other',
      other2: 'other2',
      other3: 'other3',
      other4: 'other4',
      other5: 'other5',
      other6: 'other6',
      other7: 'other7',
      other8: 'other8',
      other9: 'other9',
      other10: 'other10',
  };

  var MP_AMP_SPLIT = 'mparticle_amplitude_should_split';

  /* eslint-disable */
  // prettier-ignore
  var renderSnippet = function() {
          (function(e,t){var n=e.amplitude||{_q:[],_iq:{}};var r=t.createElement("script")
          ;r.type="text/javascript"
          ;r.integrity="sha384-girahbTbYZ9tT03PWWj0mEVgyxtZoyDF9KVZdL+R53PP5wCY0PiVUKq0jeRlMx9M"
          ;r.crossOrigin="anonymous";r.async=true
          ;r.src="https://cdn.amplitude.com/libs/amplitude-7.2.1-min.gz.js"
          ;r.onload=function(){if(!e.amplitude.runQueuedFunctions){
          console.log("[Amplitude] Error: could not load SDK");}}
          ;var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(r,i)
          ;function s(e,t){e.prototype[t]=function(){
          this._q.push([t].concat(Array.prototype.slice.call(arguments,0)));return this};}
          var o=function(){this._q=[];return this}
          ;var a=["add","append","clearAll","prepend","set","setOnce","unset"]
          ;for(var c=0;c<a.length;c++){s(o,a[c]);}n.Identify=o;var u=function(){this._q=[]
          ;return this}
          ;var l=["setProductId","setQuantity","setPrice","setRevenueType","setEventProperties"]
          ;for(var p=0;p<l.length;p++){s(u,l[p]);}n.Revenue=u
          ;var d=["init","logEvent","logRevenue","setUserId","setUserProperties","setOptOut","setVersionName","setDomain","setDeviceId","enableTracking","setGlobalUserProperties","identify","clearUserProperties","setGroup","logRevenueV2","regenerateDeviceId","groupIdentify","onInit","logEventWithTimestamp","logEventWithGroups","setSessionId","resetSessionId"]
          ;function v(e){function t(t){e[t]=function(){
          e._q.push([t].concat(Array.prototype.slice.call(arguments,0)));};}
          for(var n=0;n<d.length;n++){t(d[n]);}}v(n);n.getInstance=function(e){
          e=(!e||e.length===0?"$default_instance":e).toLowerCase()
          ;if(!n._iq.hasOwnProperty(e)){n._iq[e]={_q:[]};v(n._iq[e]);}return n._iq[e]}
          ;e.amplitude=n;})(window,document);
          /* eslint-enable */
  };

  var constructor = function () {
      var self = this,
          isInitialized = false,
          forwarderSettings,
          reportingService,
          isDefaultInstance;

      self.name = name;

      function getInstance() {
          if (isDefaultInstance) {
              return window.amplitude.getInstance();
          } else {
              return window.amplitude.getInstance(forwarderSettings.instanceName);
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
                  } else if (event.EventDataType === MessageType.Commerce) {
                      reportEvent = logCommerce(event);
                  } else if (event.EventDataType === MessageType.PageEvent) {
                      reportEvent = true;

                      if (
                          event.EventCategory ===
                          window.mParticle.EventType.Transaction
                      ) {
                          logTransaction(event);
                      } else {
                          logEvent(event);
                      }
                  }

                  if (reportEvent && reportingService) {
                      reportingService(self, event);
                  }

                  return 'Successfully sent to ' + name;
              } catch (e) {
                  return 'Failed to send to: ' + name + ' ' + e;
              }
          }

          return 'Cannot send to forwarder ' + name + ', not initialized';
      }

      function setUserIdentity(id, type) {
          if (window.mParticle.getVersion()[0] !== '1') {
              return;
          }
          if (isInitialized) {
              if (type === window.mParticle.IdentityType.CustomerId) {
                  getInstance().setUserId(id);
              } else {
                  setUserAttribute(getIdentityTypeName(type), id);
              }
          } else {
              return (
                  'Cannot call setUserIdentity on forwarder ' +
                  name +
                  ', not initialized'
              );
          }
      }

      function onUserIdentified(user) {
          var userId;

          if (isInitialized) {
              var userIdentities = user.getUserIdentities().userIdentities;

              // Additional check for email to match server
              if (forwarderSettings.includeEmailAsUserProperty === 'True') {
                  setUserAttribute('email', userIdentities.email);
              }

              try {
                  switch (forwarderSettings.userIdentification) {
                      case constants.MPID:
                          userId = user.getMPID();
                          break;
                      // server returns `customerId` whereas key on userIdentities object is `customerid`
                      case constants.customerId:
                          userId = userIdentities.customerid;
                          break;
                      case constants.email:
                          userId = userIdentities.email;
                          break;
                      case constants.other:
                          userId = userIdentities.other;
                          break;
                      case constants.other2:
                          userId = userIdentities.other2;
                          break;
                      case constants.other3:
                          userId = userIdentities.other3;
                          break;
                      case constants.other4:
                          userId = userIdentities.other4;
                          break;
                      case constants.other5:
                          userId = userIdentities.other5;
                          break;
                      case constants.other6:
                          userId = userIdentities.other6;
                          break;
                      case constants.other7:
                          userId = userIdentities.other7;
                          break;
                      case constants.other8:
                          userId = userIdentities.other8;
                          break;
                      case constants.other9:
                          userId = userIdentities.other9;
                          break;
                      case constants.other10:
                          userId = userIdentities.other10;
                          break;
                      default:
                          userId = null;
                  }
                  if (userId) {
                      return getInstance().setUserId(userId);
                  } else {
                      console.warn(
                          'A user identification type of ' +
                              forwarderSettings.userIdentification +
                              ' was selected in mParticle dashboard, but was not passed to the identity call. Please check your implementation.'
                      );
                  }
              } catch (e) {
                  console.error(
                      'Error calling onUserIdentified on forwarder ' + name
                  );
              }
          } else {
              return (
                  'Cannot call onUserIdentified on forwarder ' +
                  name +
                  ', not initialized'
              );
          }
      }

      function removeUserAttribute(key) {
          if (isInitialized) {
              if (
                  forwarderSettings.allowUnsetUserAttributes &&
                  forwarderSettings.allowUnsetUserAttributes === 'True'
              ) {
                  try {
                      var identify = new window.amplitude.Identify().unset(key);
                      getInstance().identify(identify);

                      return 'Successfully unset Amplitude user property: ' + key;
                  } catch (e) {
                      return 'Failed to call unset on ' + name + ' ' + e;
                  }
              }
          } else {
              return (
                  'Cannot call removeUserAttribute on forwarder ' +
                  name +
                  ', not initialized'
              );
          }
      }

      function setUserAttribute(key, value) {
          if (isInitialized) {
              try {
                  var attributeDict = {};
                  attributeDict[key] = value;
                  getInstance().setUserProperties(attributeDict);

                  return 'Successfully called setUserProperties API on ' + name;
              } catch (e) {
                  return (
                      'Failed to call SET setUserProperties on ' + name + ' ' + e
                  );
              }
          } else {
              return (
                  'Cannot call setUserAttribute on forwarder ' +
                  name +
                  ', not initialized'
              );
          }
      }

      function setOptOut(isOptingOut) {
          if (isInitialized) {
              getInstance().setOptOut(isOptingOut);
          } else {
              return (
                  'Cannot call setOptOut on forwarder ' +
                  name +
                  ', not initialized'
              );
          }
      }

      function logPageView(data) {
          if (data.EventAttributes) {
              data.EventAttributes = convertJsonAttrs(data.EventAttributes);
              getInstance().logEvent(
                  'Viewed ' + data.EventName,
                  data.EventAttributes
              );
          } else {
              getInstance().logEvent('Viewed ' + data.EventName);
          }
      }

      function logEvent(data) {
          if (data.EventAttributes) {
              data.EventAttributes = convertJsonAttrs(data.EventAttributes);
              getInstance().logEvent(data.EventName, data.EventAttributes);
          } else {
              getInstance().logEvent(data.EventName);
          }
      }

      function logTransaction(data) {
          if (
              !data.EventAttributes ||
              !data.EventAttributes.$MethodName ||
              !data.EventAttributes.$MethodName === 'LogEcommerceTransaction'
          ) {
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

      function createEcommerceAttributes(attributes) {
          var updatedAttributes = {};
          for (var key in attributes) {
              if (key !== 'Total Amount' && key !== 'Total Product Amount') {
                  updatedAttributes[key] = attributes[key];
              }
          }

          return convertJsonAttrs(updatedAttributes);
      }

      function logCommerce(event) {
          var summaryEvent = event;
          var expandedEvents = mParticle.eCommerce.expandCommerceEvent(event);
          // if Product Action exists, it's a non-promotion/impression commerce event
          if (event.ProductAction) {
              var isRefund, isPurchase, isMPRevenueEvent;
              var includeIndividualProductEvents =
                  forwarderSettings.excludeIndividualProductEvents === 'False';
              // Only sent separate amplitude revenue events when we includeIndividualProductEvents,
              // so create this variable for clarity
              var isSendSeparateAmplitudeRevenueEvent = includeIndividualProductEvents;

              isRefund =
                  event.ProductAction.ProductActionType ===
                  mParticle.ProductActionType.Refund;
              isPurchase =
                  event.ProductAction.ProductActionType ===
                  mParticle.ProductActionType.Purchase;
              isMPRevenueEvent = isRefund || isPurchase;

              // if the event is a revenue event, then we set it to the expanded `Total` event for backwards compatibility
              if (
                  isMPRevenueEvent &&
                  expandedEvents[0].EventName.indexOf('Total') > -1
              ) {
                  summaryEvent = expandedEvents[0];
                  sendMPRevenueSummaryEvent(
                      summaryEvent,
                      event.ProductAction.ProductList,
                      isRefund,
                      isSendSeparateAmplitudeRevenueEvent
                  );
              }

              if (!isMPRevenueEvent) {
                  sendSummaryEvent(summaryEvent);
              }

              if (includeIndividualProductEvents) {
                  sendIndividualProductEvents(
                      expandedEvents,
                      isMPRevenueEvent,
                      isSendSeparateAmplitudeRevenueEvent,
                      isRefund
                  );
              }

              return true;
          }

          // If event.ProductAction does not exist, the commerce event is a promotion or impression event
          if (
              event.EventCategory ===
                  mParticle.CommerceEventType.ProductImpression ||
              event.EventCategory === mParticle.CommerceEventType.PromotionView ||
              event.EventCategory === mParticle.CommerceEventType.PromotionClick
          ) {
              expandedEvents.forEach(function (expandedEvt) {
                  // Exclude Totals from the attributes as we log it in the revenue call
                  var updatedAttributes = createEcommerceAttributes(
                      expandedEvt.EventAttributes
                  );

                  getInstance().logEvent(
                      expandedEvt.EventName,
                      updatedAttributes
                  );
              });
              return true;
          }

          return false;
      }

      // this function does not use amplitude's logRevenueV2, but rather sends custom event names
      function sendMPRevenueSummaryEvent(
          summaryEvent,
          products,
          isRefund,
          isSendSeparateAmplitudeRevenueEvent
      ) {
          // send the ecommerce - purchase event
          var updatedAttributes = createMPRevenueEcommerceAttributes(
              summaryEvent.EventAttributes,
              isSendSeparateAmplitudeRevenueEvent,
              isRefund
          );
          updatedAttributes[MP_AMP_SPLIT] = false;

          updatedAttributes['products'] = JSON.stringify(products);
          if (isRefund) {
              getInstance().logEvent('eCommerce - Refund', updatedAttributes);
          } else {
              getInstance().logEvent('eCommerce - Purchase', updatedAttributes);
          }
      }

      // revenue summary event will either have $price/price or $revenue/revenue depending on if
      function createMPRevenueEcommerceAttributes(
          attributes,
          isSendSeparateAmplitudeRevenueEvent,
          isRefund
      ) {
          var updatedAttributes = {};
          for (var key in attributes) {
              if (key === 'Total Amount') {
                  var revenueAmount = attributes[key] * (isRefund ? -1 : 1);
                  if (isSendSeparateAmplitudeRevenueEvent) {
                      // TODO: Amplitude should confirm if both price and revenue are necessary, or just one of them
                      updatedAttributes['price'] = revenueAmount;
                      updatedAttributes['revenue'] = revenueAmount;
                  } else {
                      updatedAttributes['$price'] = revenueAmount;
                      updatedAttributes['$revenue'] = revenueAmount;
                  }
              } else if (key !== 'Total Amount') {
                  updatedAttributes[key] = attributes[key];
              }
          }

          return convertJsonAttrs(updatedAttributes);
      }

      function createAttrsForAmplitudeRevenueEvent(attributes) {
          var updatedAttributes = {};
          for (var key in attributes) {
              if (key !== 'Total Amount') {
                  updatedAttributes[key] = attributes[key];
              }
          }

          return convertJsonAttrs(updatedAttributes);
      }

      function sendSummaryEvent(summaryEvent) {
          var updatedAttributes = createEcommerceAttributes(
              summaryEvent.EventAttributes
          );
          updatedAttributes[MP_AMP_SPLIT] = false;
          try {
              updatedAttributes['products'] = JSON.stringify(
                  summaryEvent.ProductAction.ProductList
              );
          } catch (e) {
              console.log('error adding Product List to summary event');
          }

          getInstance().logEvent(summaryEvent.EventName, updatedAttributes);
      }

      function sendIndividualProductEvents(
          expandedEvents,
          isMPRevenueEvent,
          isSendSeparateAmplitudeRevenueEvent,
          isRefund
      ) {
          expandedEvents.forEach(function (expandedEvt) {
              var updatedAttributes;
              // `Total` exists on an expanded event if it is part of a revenue/purchase event
              // but not on other commerce events. This only needs to be fired if isSendSeparateAmplitudeRevenueEvent === True
              if (
                  isMPRevenueEvent &&
                  (expandedEvt.EventName.indexOf('Total') > -1) &
                      isSendSeparateAmplitudeRevenueEvent
              ) {
                  var revenueAmount =
                      (expandedEvt.EventAttributes['Total Amount'] || 0) *
                      (isRefund ? -1 : 1);
                  updatedAttributes = createAttrsForAmplitudeRevenueEvent(
                      expandedEvt.EventAttributes
                  );

                  var revenue = new window.amplitude.Revenue()
                      .setPrice(revenueAmount)
                      .setEventProperties(updatedAttributes);
                  getInstance().logRevenueV2(revenue);
              } else if (expandedEvt.EventName.indexOf('Total') === -1) {
                  updatedAttributes = createEcommerceAttributes(
                      expandedEvt.EventAttributes
                  );
                  getInstance().logEvent(
                      expandedEvt.EventName,
                      updatedAttributes
                  );
              }
          });
      }

      function convertJsonAttrs(customAttributes) {
          if (forwarderSettings.sendEventAttributesAsObjects === 'True') {
              for (var key in customAttributes) {
                  if (typeof customAttributes[key] === 'string') {
                      try {
                          var parsed = JSON.parse(customAttributes[key]);
                          if (typeof parsed === 'object') {
                              customAttributes[key] = parsed;
                          }
                      } catch (e) {
                          // if parsing fails, don't update the customAttribute object
                      }
                  }
              }
          }

          return customAttributes;
      }

      function initForwarder(settings, service, testMode) {
          var ampSettings;

          forwarderSettings = settings;
          reportingService = service;

          try {
              if (!window.amplitude) {
                  if (testMode !== true) {
                      renderSnippet();
                  }
              }

              ampSettings = {};

              // allow the client to set custom amplitude init properties
              if (
                  typeof window.AmplitudeInitSettings === 'object' &&
                  window.AmplitudeInitSettings !== null
              ) {
                  ampSettings = window.AmplitudeInitSettings;
              }

              if (forwarderSettings.saveEvents) {
                  ampSettings.saveEvents =
                      forwarderSettings.saveEvents === 'True';
              }

              if (forwarderSettings.savedMaxCount) {
                  ampSettings.savedMaxCount = parseInt(
                      forwarderSettings.savedMaxCount,
                      10
                  );
              }

              if (forwarderSettings.uploadBatchSize) {
                  ampSettings.uploadBatchSize = parseInt(
                      forwarderSettings.uploadBatchSize,
                      10
                  );
              }

              if (forwarderSettings.includeUtm) {
                  ampSettings.includeUtm =
                      forwarderSettings.includeUtm === 'True';
              }

              if (forwarderSettings.includeReferrer) {
                  ampSettings.includeReferrer =
                      forwarderSettings.includeReferrer === 'True';
              }

              if (forwarderSettings.forceHttps) {
                  ampSettings.forceHttps =
                      forwarderSettings.forceHttps === 'True';
              }

              if (forwarderSettings.baseUrl) {
                  ampSettings.apiEndpoint = forwarderSettings.baseUrl;
              }

              isDefaultInstance =
                  !forwarderSettings.instanceName ||
                  forwarderSettings.instanceName === 'default';

              getInstance().init(forwarderSettings.apiKey, null, ampSettings);
              isInitialized = true;

              if (forwarderSettings.userIdentification === constants.MPID) {
                  if (window.mParticle && window.mParticle.Identity) {
                      var user = window.mParticle.Identity.getCurrentUser();
                      if (user) {
                          var userId = user.getMPID();
                          getInstance().setUserId(userId);
                      }
                  }
              }

              return 'Successfully initialized: ' + name;
          } catch (e) {
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
          console.log(
              'You must pass a config object to register the kit ' + name
          );
          return;
      }

      if (!isObject(config)) {
          console.log(
              'The "config" must be an object. You passed in a ' + typeof config
          );
          return;
      }

      if (isObject(config.kits)) {
          config.kits[name] = {
              constructor: constructor,
          };
      } else {
          config.kits = {};
          config.kits[name] = {
              constructor: constructor,
          };
      }
      console.log(
          'Successfully registered ' + name + ' to your mParticle configuration'
      );
  }

  if (typeof window !== 'undefined') {
      if (window && window.mParticle && window.mParticle.addForwarder) {
          window.mParticle.addForwarder({
              name: name,
              constructor: constructor,
              getId: getId,
          });
      }
  }

  var Amplitude = {
      register: register,
  };
  var Amplitude_1 = Amplitude.register;

  exports.default = Amplitude;
  exports.register = Amplitude_1;

  return exports;

}({}));
