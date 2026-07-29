# Google Play background-location submission

Use this material for the background-location permission declaration for
`com.monitriip.driver`.

## Single declared feature

**Continuous route recording during an active professional trip**

Do not list passenger boarding, occurrence records, nearby services, advertising,
or any other functionality as a background-location feature.

## Declaration description

Monitriip Driver is used by professional drivers to record an assigned vehicle's
route during an active trip. The driver explicitly starts the trip in the app.
From that moment until the driver taps "Terminar viagem", the app collects precise
location approximately every 15 seconds or 50 metres and sends it to the fleet
operator's tracking system. Tracking must continue while the screen is locked or
the app is in the background so the route is not interrupted while the driver is
operating the vehicle. A persistent Android notification identifies the active
tracking service. Without continuous route recording, the app cannot perform its
primary trip-monitoring and route-evidence function. Location is not used for
advertising.

## Short Play Console answer

Monitriip Driver records and sends the assigned vehicle's route while the driver
is on an active professional trip. The driver starts and ends tracking using the
"Iniciar viagem" and "Terminar viagem" controls. Background access is required
because route recording must continue while the driver uses navigation, locks the
screen, or otherwise leaves the app. Tracking stops when the trip ends. The fleet
operator uses the route for operational monitoring and trip evidence. Location is
not used for advertising.

## Reviewer access instructions

Replace every bracketed value before submission.

1. Sign in with reviewer account `[EMAIL]` and password `[PASSWORD]`.
2. On the vehicle list, select `[VEHICLE NAME / PLATE]`.
3. Tap **Iniciar viagem**.
4. Enter `[TEST TRIP LICENCE]` and tap **Continuar**.
5. Read the in-app disclosure and tap **Permitir e iniciar**.
6. Grant location while using the app, then allow location all the time when
   Android requests it.
7. Minimise the app or lock the screen. The persistent notification **Viagem
   Monitriip ativa** confirms that route recording remains active.
8. Reopen the app and tap **Terminar viagem** to stop location collection.

Keep the test vehicle available and the test account unrestricted for the entire
review period.

## Demonstration video

Record an Android device, preferably in 30 seconds or less, showing:

1. Opening Monitriip Driver and signing in.
2. Selecting the test vehicle and tapping **Iniciar viagem**.
3. Entering the trip licence.
4. The complete **Localização durante a viagem** disclosure.
5. The affirmative **Permitir e iniciar** action and both Android permission
   steps.
6. The active-trip screen.
7. The app moving to the background and the persistent location notification.
8. The route arriving in the fleet tracking interface, if it can be shown
   concisely.
9. Returning to the app and ending the trip.
10. In a second short take, choosing **Agora não**, then starting the flow again,
    so the non-consent path is visible.

Use an unlisted YouTube URL or a publicly accessible, non-expiring Google Drive
link. Verify the link in a signed-out browser.

## Store listing language

Include this concept in the full description:

> Registo contínuo do percurso durante uma viagem ativa, mesmo com o ecrã
> bloqueado ou a aplicação em segundo plano. O motorista inicia e termina o
> acompanhamento diretamente na aplicação.

At least one store screenshot should make the active-trip tracking feature
visible.

## Prominent disclosure used in the app

> O Monitriip Driver coleta sua localização precisa para registrar e enviar o
> percurso da viagem ativa à empresa responsável pela frota, mesmo quando o app
> está em segundo plano ou não está em uso.
>
> A coleta começa quando você inicia a viagem e termina quando toca em "Terminar
> viagem". A localização é usada pela empresa para acompanhar a operação e
> comprovar o percurso. Ela não é usada para anúncios.

## Before resubmitting

- Publish a new Android App Bundle containing this disclosure.
- Confirm that every active testing and production track uses a compliant bundle;
  deactivate obsolete non-compliant releases where Play Console permits it.
- Add a working, non-editable HTML privacy-policy URL to the store listing.
- Add the same privacy-policy link inside the app. The policy must name Monitriip
  Driver or the same developer entity shown in the listing, explain precise and
  background location, name the categories of recipients, and explain retention
  and deletion.
- Make the Play Console Data safety answers match the actual collection,
  transmission, retention, and deletion behavior.
- Complete the foreground-service declaration for the location service if Play
  Console presents it.
- Test start, background operation, denial, retry, and stop on a physical Android
  device using the exact review build.
