document.addEventListener('DOMContentLoaded', function() {
    // Payment method switching
    const methodOptions = document.querySelectorAll('.method-option');
    const paymentForms = document.querySelectorAll('.payment-form');
    const submitBtn = document.getElementById('submit-payment');
    let currentPaymentMethod = 'card';

    // Initialize Braintree
    let braintreeClient;
    let hostedFieldsInstance;
    let paypalInstance;
    let venmoInstance;
    let dataCollectorInstance;

    // Replace with your actual client token from server
    const clientToken = 'sandbox_9dbg82cq_dcpspy2brwdjr3qn';

    braintree.client.create({
        authorization: clientToken
    }, function(clientErr, clientInstance) {
        if (clientErr) {
            console.error('Error creating client:', clientErr);
            showMessage('Payment system error. Please try again later.', 'error');
            return;
        }

        braintreeClient = clientInstance;
        setupHostedFields(clientInstance);
        setupPayPal(clientInstance);
        setupVenmo(clientInstance);
        setupDataCollector(clientInstance);
    });

    // Payment method switching
    methodOptions.forEach(option => {
        option.addEventListener('click', function() {
            const method = this.getAttribute('data-method');
            currentPaymentMethod = method;

            // Update active method option
            methodOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');

            // Update active payment form
            paymentForms.forEach(form => form.classList.remove('active'));
            document.getElementById(`${method}-payment-form`).classList.add('active');
        });
    });

    // Process payment when submit button clicked
    submitBtn.addEventListener('click', function(event) {
        event.preventDefault();
        processPayment();
    });

    function processPayment() {
        const amount = document.getElementById('payment-amount').value;
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            showMessage('Please enter a valid amount', 'error');
            return;
        }

        // Disable button and show loading state
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        if (currentPaymentMethod === 'card') {
            processCardPayment();
        } else {
            // For PayPal and Venmo, just reset the button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            showMessage(`Please use the ${currentPaymentMethod} button above to complete your payment`, 'error');
        }
    }

    function processCardPayment() {
        const amount = document.getElementById('payment-amount').value;
        const cardName = document.getElementById('card-name').value;
        const saveCard = document.getElementById('save-card-client').checked;

        if (!cardName) {
            showMessage('Please enter the name on your card', 'error');
            resetSubmitButton();
            return;
        }

        hostedFieldsInstance.tokenize(function(tokenizeErr, payload) {
            if (tokenizeErr) {
                showMessage('Payment failed: ' + getErrorMessage(tokenizeErr), 'error');
                resetSubmitButton();
                return;
            }

            // Simulate processing payment
            setTimeout(() => {
                showMessage(`Payment of $${amount} processed successfully!`, 'success');
                resetSubmitButton();

                // Clear form
                document.getElementById('card-form').reset();
                hostedFieldsInstance.clear();
            }, 2000);
        });
    }

    function resetSubmitButton() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Now';
    }

    function showMessage(message, type) {
        const messageEl = document.getElementById('client-message');
        messageEl.textContent = message;
        messageEl.className = 'message ' + (type || '');
    }

    function getErrorMessage(error) {
        if (error.details && error.details.invalidFieldKeys) {
            return 'Please check your card details and try again';
        }
        return error.message;
    }

    function setupHostedFields(clientInstance) {
        braintree.hostedFields.create({
            client: clientInstance,
            styles: {
                'input': {
                    'font-size': '16px',
                    'color': '#333',
                    'font-family': 'Roboto, sans-serif'
                },
                '.invalid': {
                    'color': '#dc3545'
                },
                '.valid': {
                    'color': '#28a745'
                }
            },
            fields: {
                number: {
                    selector: '#card-number',
                    placeholder: '4111 1111 1111 1111'
                },
                cvv: {
                    selector: '#cvv',
                    placeholder: '123'
                },
                expirationDate: {
                    selector: '#expiration-date',
                    placeholder: 'MM/YY'
                }
            }
        }, function(hostedFieldsErr, instance) {
            if (hostedFieldsErr) {
                console.error('Error creating hosted fields:', hostedFieldsErr);
                showMessage('Error setting up card payment. Please try another method.', 'error');
                return;
            }

            hostedFieldsInstance = instance;
        });
    }

    function setupPayPal(clientInstance) {
        braintree.paypal.create({
            client: clientInstance
        }, function(paypalErr, instance) {
            if (paypalErr) {
                console.error('Error creating PayPal instance:', paypalErr);
                return;
            }

            paypalInstance = instance;

            instance.Button.render({
                env: 'sandbox',
                style: {
                    shape: 'rect',
                    color: 'blue',
                    size: 'responsive',
                    label: 'paypal'
                },
                payment: function() {
                    return instance.createPayment({
                        flow: 'checkout',
                        amount: document.getElementById('payment-amount').value,
                        currency: 'USD'
                    });
                },
                onAuthorize: function(data) {
                    return instance.tokenizePayment(data, function(tokenizeErr, payload) {
                        if (tokenizeErr) {
                            showMessage('Payment failed: ' + tokenizeErr.message, 'error');
                            return;
                        }

                        showMessage(`Payment of $${document.getElementById('payment-amount').value} processed successfully via PayPal!`, 'success');
                    });
                },
                onCancel: function(data) {
                    showMessage('PayPal payment canceled', 'error');
                },
                onError: function(err) {
                    showMessage('PayPal error: ' + err.message, 'error');
                }
            }, '#paypal-button-container');
        });
    }

    function setupVenmo(clientInstance) {
        braintree.venmo.create({
            client: clientInstance,
            allowDesktop: true,
            paymentMethodUsage: 'multi_use'
        }, function(venmoErr, instance) {
            if (venmoErr) {
                console.error('Error creating Venmo instance:', venmoErr);
                return;
            }

            venmoInstance = instance;

            if (!instance.isBrowserSupported()) {
                document.getElementById('venmo-button-container').innerHTML =
                    '<p class="payment-note">Venmo is not supported in this browser</p>';
                return;
            }

            instance.create({
                includeDisplayName: true,
                requireEmail: true
            }, function(createErr, venmoButton) {
                if (createErr) {
                    console.error('Error creating Venmo button:', createErr);
                    return;
                }

                venmoButton.on('payment', function(venmoData) {
                    showMessage(`Payment of $${document.getElementById('payment-amount').value} processed successfully via Venmo!`, 'success');
                });

                venmoButton.on('error', function(venmoError) {
                    showMessage('Venmo error: ' + venmoError.message, 'error');
                });

                venmoButton.render('#venmo-button-container');
            });
        });
    }

    function setupDataCollector(clientInstance) {
        braintree.dataCollector.create({
            client: clientInstance,
            paypal: true
        }, function(err, instance) {
            if (err) {
                console.error('Error creating data collector:', err);
                return;
            }

            dataCollectorInstance = instance;
        });
    }
});