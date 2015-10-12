describe('Amplitude forwarder', function () {
    var MessageType = {
            SessionStart: 1,
            SessionEnd: 2,
            PageView: 3,
            PageEvent: 4,
            CrashReport: 5,
            OptOut: 6,
            Commerce: 16
        },
        EventType = {
            Unknown: 0,
            Navigation: 1,
            Location: 2,
            Search: 3,
            Transaction: 4,
            UserContent: 5,
            UserPreference: 6,
            Social: 7,
            Other: 8,
            Media: 9,
            getName: function () {
                return 'blahblah';
            }
        },
        ProductActionType = {
            Unknown: 0,
            AddToCart: 1,
            RemoveFromCart: 2,
            Checkout: 3,
            CheckoutOption: 4,
            Click: 5,
            ViewDetail: 6,
            Purchase: 7,
            Refund: 8,
            AddToWishlist: 9,
            RemoveFromWishlist: 10,
        },
        IdentityType = {
            Other: 0,
            CustomerId: 1,
            Facebook: 2,
            Twitter: 3,
            Google: 4,
            Microsoft: 5,
            Yahoo: 6,
            Email: 7,
            Alias: 8,
            FacebookCustomAudienceId: 9,
            getName: function () {return 'CustomerID';}
        },
        ReportingService = function () {
            var self = this;

            this.id = null;
            this.event = null;

            this.cb = function (forwarder, event) {
                self.id = forwarder.id;
                self.event = event;
            };

            this.reset = function () {
                this.id = null
                this.event = null;
            };
        },
        reportService = new ReportingService();

    before(function () {
        mParticle.EventType = EventType;
        mParticle.ProductActionType = ProductActionType;
        mParticle.IdentityType = IdentityType;
        mParticle.generateHash = function(name) {
            var hash = 0,
                i = 0,
                character;

            if (!name) {
                return null;
            }

            name = name.toString().toLowerCase();

            if (Array.prototype.reduce) {
                return name.split("").reduce(function (a, b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
            }

            if (name.length === 0) {
                return hash;
            }

            for (i = 0; i < name.length; i++) {
                character = name.charCodeAt(i);
                hash = ((hash << 5) - hash) + character;
                hash = hash & hash;
            }

            return hash;
        };

        mParticle.forwarder.init({
            saveEvents: 'True',
            savedMaxCount: 20,
            uploadBatchSize: 5,
            includeUtm: 'False',
            includeReferrer: 'True'
        }, reportService.cb, true);
    });

    beforeEach(function() {
        window.amplitude.reset();
    });

    it('should log event', function (done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageEvent,
            EventName: 'Test Event',
            EventAttributes: {
                Key: 'Value'
            }
        });

        amplitude.should.have.property('eventName', 'Test Event');
        amplitude.should.have.property('attrs');
        amplitude.attrs.should.have.property('Key', 'Value');

        done();
    });

    it('should log page view', function (done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageView,
            EventName: 'Test Page View',
            EventAttributes: {
                Path: 'Test'
            }
        });

        amplitude.should.have.property('eventName', 'Viewed Test Page View');
        amplitude.should.have.property('attrs');
        amplitude.attrs.should.have.property('Path', 'Test');

        done();
    });

    it('should log transaction', function (done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageEvent,
            EventCategory: EventType.Transaction,
            EventAttributes: {
                $MethodName: 'LogEcommerceTransaction',
                RevenueAmount: 400,
                ProductQuantity: 1,
                ProductSKU: '12345'
            }
        });

        amplitude.should.have.property('amount', 400);
        amplitude.should.have.property('quantity', 1);
        amplitude.should.have.property('sku', '12345');

        done();
    });

    it('should set customer id user identity', function(done) {
        mParticle.forwarder.setUserIdentity('tbreffni@mparticle.com', IdentityType.CustomerId);

        amplitude.should.have.property('userId', 'tbreffni@mparticle.com');

        done();
    });

    it('should set user attribute', function(done) {
        mParticle.forwarder.setUserAttribute('gender', 'male');

        amplitude.should.have.property('props');
        amplitude.props.should.have.property('gender', 'male')

        done();
    });

    it('should set opt out', function (done) {
        mParticle.forwarder.setOptOut(true);

        amplitude.should.have.property('isOptingOut', true);

        done();
    });

    it('should parse forwarder settings', function (done) {

        amplitude.settings.should.have.property('saveEvents', true);
        amplitude.settings.should.have.property('savedMaxCount', 20);
        amplitude.settings.should.have.property('uploadBatchSize', 5);
        amplitude.settings.should.have.property('includeUtm', false);
        amplitude.settings.should.have.property('includeReferrer', true);

        done();
    });

    it('should log commerce events', function (done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            ProductAction: {
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    }
                ]
            }
        });

        amplitude.should.have.property('amount', 400);
        amplitude.should.have.property('sku', '12345');
        amplitude.should.have.property('quantity', 1);

        done();
    });
});
