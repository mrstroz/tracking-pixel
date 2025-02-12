/**
 * @fileoverview Advanced Tracking Pixel Implementation
 * This file implements a comprehensive tracking solution similar to Facebook Pixel and Plausible Analytics.
 * It provides cross-domain tracking capabilities and collects various user metrics and behaviors.
 *
 * Features:
 * - Cross-domain visitor tracking
 * - Session management
 * - User behavior analytics
 * - Performance metrics
 * - Custom event tracking
 * - Bot detection
 *
 * @version 1.0.0
 * @author Your Team
 * @license MIT
 */

(function () {
    // Configuration constants
    const TRACKING_ENDPOINT = 'https://tracking-pixel.apps.codelines.io/track';
    const COOKIE_NAME = '_tp_visitor_id';
    const COOKIE_DOMAIN = '.apps.codelines.io'; // Set this to your top-level domain for cross-domain tracking

    /**
     * @class TrackingPixel
     * @description Main tracking pixel implementation class that handles all tracking functionality
     */
    class TrackingPixel {
        /**
         * @constructor
         * Initializes the tracking pixel and sets up visitor identification
         */
        constructor() {
            this.visitorId = this.getOrCreateVisitorId();
            this.sessionId = this.generateId();
            this.init();
        }

        /**
         * @method generateId
         * @description Generates a UUID v4 for unique identification
         * @returns {string} UUID v4 string
         * @private
         */
        generateId() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        /**
         * @method getOrCreateVisitorId
         * @description Retrieves existing visitor ID from cookies or creates a new one
         * @returns {string} Visitor ID
         * @private
         */
        getOrCreateVisitorId() {
            let visitorId = this.getCookie(COOKIE_NAME);
            if (!visitorId) {
                visitorId = this.generateId();
                this.setCookie(COOKIE_NAME, visitorId, 365); // Cookie valid for one year
            }
            return visitorId;
        }

        /**
         * @method setCookie
         * @description Sets a cookie with cross-domain support
         * @param {string} name - Cookie name
         * @param {string} value - Cookie value
         * @param {number} days - Days until expiration
         * @private
         */
        setCookie(name, value, days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            const expires = `expires=${date.toUTCString()}`;
            document.cookie = `${name}=${value};${expires};path=/;domain=${COOKIE_DOMAIN};SameSite=Lax`;
        }

        /**
         * @method getCookie
         * @description Retrieves a cookie value by name
         * @param {string} name - Cookie name
         * @returns {string|null} Cookie value or null if not found
         * @private
         */
        getCookie(name) {
            const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            return match ? match[2] : null;
        }

        /**
         * @method collectData
         * @description Collects comprehensive user and environment data
         * @returns {Object} Collection of all tracking metrics
         * @private
         */
        collectData() {
            const screen = window.screen;
            const navigator = window.navigator;
            const document = window.document;
            const location = window.location;

            return {
                // Identification metrics
                visitor_id: this.visitorId,
                session_id: this.sessionId,

                // URL and page data
                url: location.href,
                referrer: document.referrer,
                path: location.pathname,
                search: location.search,
                title: document.title,

                // Browser and device information
                user_agent: navigator.userAgent,
                language: navigator.language,
                screen_width: screen.width,
                screen_height: screen.height,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
                pixel_ratio: window.devicePixelRatio,

                // Performance metrics
                load_time: window.performance?.timing?.loadEventEnd - window.performance?.timing?.navigationStart,

                // Time and location data
                timestamp: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                platform: navigator.platform,
                do_not_track: navigator.doNotTrack,
                bot: this.isBot(),
            };
        }

        /**
         * @method isBot
         * @description Detects if the current user is likely a bot
         * @returns {boolean} True if user agent matches known bot patterns
         * @private
         */
        isBot() {
            const botPatterns = [
                'bot', 'spider', 'crawler', 'selenium', 'headless',
                'puppet', 'chrome-lighthouse', 'googlebot'
            ];
            const userAgent = navigator.userAgent.toLowerCase();
            return botPatterns.some(pattern => userAgent.includes(pattern));
        }

        /**
         * @method sendData
         * @description Sends collected data to the tracking endpoint
         * @param {string} eventName - Name of the event being tracked
         * @param {Object} customData - Additional custom data to include
         * @returns {Promise<void>}
         * @private
         */
        async sendData(eventName = 'pageview', customData = {}) {
            try {
                const data = {
                    ...this.collectData(),
                    event_name: eventName,
                    ...customData
                };

                // Use sendBeacon for better reliability during page unload
                if (navigator.sendBeacon) {
                    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
                    navigator.sendBeacon(TRACKING_ENDPOINT, blob);
                } else {
                    // Fallback to fetch API
                    await fetch(TRACKING_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data),
                        keepalive: true
                    });
                }
            } catch (error) {
                console.error('Error sending tracking data:', error);
            }
        }

        /**
         * @method trackEvent
         * @description Public method for tracking custom events
         * @param {string} eventName - Name of the event
         * @param {Object} eventData - Custom data for the event
         * @public
         */
        trackEvent(eventName, eventData = {}) {
            this.sendData(eventName, eventData);
        }

        /**
         * @method init
         * @description Initializes all tracking listeners and default behaviors
         * @private
         */
        init() {
            // Track initial pageview
            this.sendData('pageview');

            // Setup time tracking
            let lastActivityTime = Date.now();
            let totalTimeSpent = 0;

            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    totalTimeSpent += Date.now() - lastActivityTime;
                }
                lastActivityTime = Date.now();
            }, 1000);

            // Track page exit
            window.addEventListener('beforeunload', () => {
                this.sendData('page_leave', {time_spent: totalTimeSpent});
            });

            // Track clicks on interactive elements
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button');
                if (target) {
                    this.trackEvent('click', {
                        element_type: target.tagName.toLowerCase(),
                        element_text: target.textContent?.trim(),
                        element_url: target.href || null
                    });
                }
            });

            // Track scroll depth
            let maxScroll = 0;
            window.addEventListener('scroll', () => {
                const scrollPercentage = Math.round(
                    (window.scrollY + window.innerHeight) /
                    document.documentElement.scrollHeight * 100
                );

                if (scrollPercentage > maxScroll) {
                    maxScroll = scrollPercentage;
                    if (maxScroll % 25 === 0) { // Track every 25% scroll depth
                        this.trackEvent('scroll_depth', {depth: maxScroll});
                    }
                }
            });
        }
    }

    // Initialize and expose to global scope
    window.TrackingPixel = new TrackingPixel();
})();