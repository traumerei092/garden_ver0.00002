$(function () {
    $('#signup-tab').on('click', function() {
        $('#signup-form-container').addClass('active');
        $('#login-form-container').removeClass('active');
    });

    $('#login-tab').on('click', function() {
        $('#signup-form-container').removeClass('active');
        $('#login-form-container').addClass('active');
    });
});