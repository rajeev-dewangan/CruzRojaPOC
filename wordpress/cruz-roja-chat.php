<?php
/**
 * Plugin Name: Cruz Roja Chat Widget
 * Description: Loads the Cruz Roja assistant widget (floating button + chat iframe) on every front-end page.
 * Version:     1.0.0
 *
 * INSTALL: copy this file to wp-content/mu-plugins/ on the WordPress site.
 * Files in mu-plugins/ activate on their own — there is nothing to enable in
 * the admin, and a theme update cannot remove them.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // called directly, not through WordPress
}

/**
 * The deployed Next.js app. No trailing slash.
 * widget.js normally derives the app origin from its own <script src>, so this
 * is also what makes the iframe point at the right place.
 */
const CRUZ_ROJA_APP_URL = 'https://cruz-roja-poc.vercel.app';

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_script(
			'cruz-roja-chat',
			CRUZ_ROJA_APP_URL . '/widget.js',
			array(),  // no dependencies — plain ES5, no jQuery
			'1.1.0',  // bump after changing widget.js so browsers and CDNs refetch
			true      // footer: the loader appends to document.body
		);
	}
);
