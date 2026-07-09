; NewPlayer — professional NSIS customizations
; Included by electron-builder

!macro customHeader
  ; Branding text in installer chrome
  BrandingText "NewPlayer — NewTube · NewTV · NewRadio · NewWeather · New(s)"
!macroend

!macro customWelcomePage
  ; Default welcome page is fine; keep hook for future copy
!macroend

!macro customInstallMode
  ; Prefer current-user install (no admin) unless user chooses all-users
!macroend

!macro customInstall
  ; Ensure Start Menu folder exists cleanly
  CreateDirectory "$SMPROGRAMS\NewPlayer"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\NewPlayer\NewPlayer.lnk"
  Delete "$SMPROGRAMS\NewPlayer\Uninstall NewPlayer.lnk"
  RMDir "$SMPROGRAMS\NewPlayer"
!macroend

!macro customFinishPage
  ; Launch after install is handled by electron-builder runAfterFinish
!macroend
