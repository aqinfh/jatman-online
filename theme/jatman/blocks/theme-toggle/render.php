<?php
/** Tombol toggle tema. aria-pressed disinkronkan oleh assets/js/theme.js. */
?>
<button <?php echo get_block_wrapper_attributes( [ 'class' => 'jm-theme-toggle' ] ); ?> type="button" aria-pressed="false" aria-label="Mode gelap" data-jm-theme-toggle>
	<svg class="jm-icon jm-icon--moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.7 14.6A8.5 8.5 0 0 1 9.4 3.3a.7.7 0 0 0-.9-.9 10 10 0 1 0 13.1 13.1.7.7 0 0 0-.9-.9z"/></svg>
	<svg class="jm-icon jm-icon--sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>
</button>
