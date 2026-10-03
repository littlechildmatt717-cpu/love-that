package com.meetdating.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

object NotifChannels {
    const val MATCHES = "matches"
    const val LIKES = "likes"
    const val MESSAGES = "messages"
    const val SHORTS = "shorts"
    const val EVENTS = "events"

    fun create(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        fun ch(id: String, name: String, imp: Int) =
            nm.createNotificationChannel(NotificationChannel(id, name, imp))
        ch(MATCHES, "Mutual likes", NotificationManager.IMPORTANCE_HIGH)
        ch(LIKES, "Likes", NotificationManager.IMPORTANCE_DEFAULT)
        ch(MESSAGES, "Messages", NotificationManager.IMPORTANCE_HIGH)
        ch(SHORTS, "Short likes & comments", NotificationManager.IMPORTANCE_DEFAULT)
        ch(EVENTS, "Event reminders", NotificationManager.IMPORTANCE_HIGH)
    }

    /** Call after login and from Application.onCreate(). */
    fun registerToken() {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        FirebaseMessaging.getInstance().token.addOnSuccessListener { saveToken(uid, it) }
    }

    fun saveToken(uid: String, token: String) {
        FirebaseFirestore.getInstance().collection("users").document(uid)
            .update("fcmTokens", FieldValue.arrayUnion(token))
    }

    /** Call on logout, BEFORE signing out. */
    fun removeToken() {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        FirebaseMessaging.getInstance().token.addOnSuccessListener { t ->
            FirebaseFirestore.getInstance().collection("users").document(uid)
                .update("fcmTokens", FieldValue.arrayRemove(t))
        }
    }
}

class AppMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        FirebaseAuth.getInstance().currentUser?.uid?.let { NotifChannels.saveToken(it, token) }
    }

    // Runs when app is in foreground (background notifications are shown by the system).
    override fun onMessageReceived(msg: RemoteMessage) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) return

        val d = msg.data
        val title = msg.notification?.title ?: d["title"] ?: return
        val body = msg.notification?.body ?: d["body"] ?: ""
        val channel = d["channelId"] ?: NotifChannels.LIKES

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            d.forEach { (k, v) -> putExtra(k, v) }   // type, chatId, shortId, eventId, ...
        }
        val pi = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val n = NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_stat_notification) // add a white-on-transparent icon
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), n)
    }
}
