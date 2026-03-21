export function getImagePath(imageId: string): string {
  return `/images/${imageId}.jpg`;
}

export function getMoviePath(movieId: string): string {
  return `/movies/${movieId}.mp4`;
}

export function getMoviePreviewPath(movieId: string): string {
  return `/api/v1/movies/${movieId}/preview`;
}

export function getSoundPath(soundId: string): string {
  return `/sounds/${soundId}.mp3`;
}

export function getProfileImagePath(profileImageId: string): string {
  return `/images/profiles/${profileImageId}.jpg`;
}
