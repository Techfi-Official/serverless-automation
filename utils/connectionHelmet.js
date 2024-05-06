module.exports = {
    'connect-src': ["'self'", 'https://reqres.in/api/users?page=2'],
    'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https://d39oted90y97ty.cloudfront.net',
        'https://idsb.tmgrup.com.tr/ly/uploads/images/2023/11/14/301015.jpg',
    ],
    'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://d39oted90y97ty.cloudfront.net',
        'https://a2pejekyml.execute-api.us-east-1.amazonaws.com/PROD/post-image-ai',
        'https://code.jquery.com/jquery-3.6.0.js',
        'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js',
        'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js',
        'https://cdn.jsdelivr.net/npm/sweetalert2@11.10.8/dist/sweetalert2.min.css',
        'https://cdn.jsdelivr.net/npm/sweetalert2@11.10.8/dist/sweetalert2.all.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css',
    ],
}
