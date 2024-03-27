/* eslint-disable no-undef */
document.addEventListener('DOMContentLoaded', function () {
    const imageContainer = document.querySelectorAll('.image-container')
    toastr.options.timeOut = 3000
    toastr.options.closeEasing = 'swing'
    toastr.options.closeButton = true
    toastr.options.preventDuplicates = true

    imageContainer.forEach((container) => {
        container.addEventListener('click', function () {
            imageContainer.forEach((img) =>
                img.classList.remove('image-selected')
            )
            this.classList.toggle('image-selected')
            const selectedImageUrl = this.querySelector('img').src
            console.log('Selected Image URL:', selectedImageUrl)
        })
    })

    const textInputIMG = document.getElementById('textInputIMG')
    const textInputPOST = document.getElementById('textInputPOST')
    const textInputIMGValue = document.getElementById('textInputIMGValue')
    const textInputPOSTValue = document.getElementById('textInputPOSTValue')
    const maxLength = 200
    function validateForm(dataForm, output, err) {
        // --- Prevent the user from pasting more than the maxLength ---
        dataForm.addEventListener('paste', function (event) {
            const clipboardData = event.clipboardData || window.clipboardData
            const pastedText = clipboardData.getData('text/plain')
            if (dataForm.value.length + pastedText.length > 200) {
                dataForm.classList.add('is-invalid')
                document.getElementById(err).innerText =
                    'Cannot type text as it would exceed the 200 character limit!'

                event.preventDefault()
            }
        })

        // --- Prevent the user from typing more than the maxLength ---
        dataForm.addEventListener('keydown', function (e) {
            const currentLength = dataForm.value.length
            const isControlKey = [
                'Backspace',
                'Delete',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
            ].includes(e.key)
            console.log('Enter', e.key)
            if (!isControlKey && currentLength >= maxLength) {
                e.preventDefault()
                dataForm.classList.add('is-invalid')
                document.getElementById(err).innerText =
                    'Cannot type text as it would exceed the 200 character limit!'
            }
        })

        // --- Calculate the length of the input field Characters ---
        dataForm.addEventListener('input', function (e) {
            console.log('e', e.target.value)
            output.innerText =
                e.target.value.length + `/${maxLength} characters`
            document.getElementById(err).innerText = null
            dataForm.classList.remove('is-invalid')
        })
    }

    validateForm(textInputIMG, textInputIMGValue, 'textInputIMGErr')
    validateForm(textInputPOST, textInputPOSTValue, 'textInputPOSTErr')
})
