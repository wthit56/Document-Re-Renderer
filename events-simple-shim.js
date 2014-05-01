if (!window.addEventListener && window.attachEvent) { // addEventListener
	(function () {
		(HTMLDocument || Window).prototype.addEventListener = Element.prototype.addEventListener =
			function (type, listener, useCapture) {
				return this.attachEvent("on" + type, listener, useCapture);
			};

		(HTMLDocument || Window).prototype.removeEventListener = Element.prototype.removeEventListener =
			function (type, listener, useCapture) {
				return this.detachEvent("on" + type, listener);
			};
	})();
}
