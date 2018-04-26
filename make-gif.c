#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include "gifenc.h"

static uint8_t palette[] = {
  190,	74,	47,
  215,	118,	67,
  234,	212,	170,
  228,	166,	114,
  184,	111,	80,
  115,	62,	57,
  62,	39,	49,
  162,	38,	51,
  228,	59,	68,
  247,	118,	34,
  254,	174,	52,
  254,	231,	97,
  99,	199,	77,
  62,	137,	72,
  38,	92,	66,
  25,	60,	62,
  18,	78,	137,
  0,	153,	219,
  44,	232,	245,
  255,	255,	255,
  192,	203,	220,
  139,	155,	180,
  90,	105,	136,
  58,	68,	102,
  38,	43,	68,
  24,	20,	37,
  255,	0,	68,
  104,	56,	108,
  181,	80,	136,
  246,	117,	122,
  232,	183,	150,
  194,	133,	105,
};

static uint8_t logo[] = {
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 12, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 0, 12, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 2, 2, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 12, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 12, 2, 2, 2, 2, 0, 0, 0, 12, 2, 2, 0, 0, 0, 12, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 12, 12, 0, 12, 2, 2, 2, 2, 2, 2, 2, 0, 0, 12, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0,
  0, 0, 0, 0, 12, 12, 12, 12, 2, 2, 12, 2, 2, 0, 0, 0, 2, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 12, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 12, 12, 12, 0,
  0, 12, 12, 12, 12, 2, 2, 2, 2, 2, 0, 2, 2, 2, 0, 0, 0, 2, 2, 0, 0, 12, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 2, 2, 2, 2, 12, 12, 12, 12, 12, 0,
  0, 12, 2, 2, 2, 2, 2, 2, 0, 0, 0, 12, 2, 2, 0, 0, 0, 12, 2, 2, 0, 12, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 12, 12, 12, 12, 12, 0, 0, 0, 0,
  0, 12, 2, 2, 2, 12, 12, 12, 0, 0, 0, 12, 2, 2, 0, 0, 12, 12, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 12, 12, 12, 2, 12, 12, 0, 0, 0,
  0, 0, 2, 2, 12, 12, 2, 2, 2, 0, 0, 0, 2, 2, 12, 12, 12, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 12, 12, 0, 0, 0, 0, 0, 2, 12, 12, 0, 0, 0,
  0, 0, 12, 2, 2, 2, 2, 2, 2, 0, 0, 0, 12, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 0, 0, 2, 12, 12, 0, 0, 0, 0, 0, 0, 12, 12, 0, 0, 0,
  0, 0, 12, 2, 2, 2, 2, 0, 12, 12, 0, 0, 12, 2, 2, 2, 2, 2, 0, 0, 2, 2, 0, 0, 2, 12, 12, 0, 2, 12, 12, 12, 0, 0, 0, 0, 0, 2, 12, 12, 0, 0,
  0, 0, 0, 2, 2, 12, 12, 12, 12, 2, 2, 0, 0, 2, 2, 0, 0, 0, 2, 2, 2, 12, 12, 0, 2, 12, 12, 2, 2, 12, 12, 12, 0, 0, 0, 0, 0, 2, 12, 12, 0, 0,
  0, 0, 0, 12, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 12, 12, 12, 12, 0, 0, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0, 12, 12, 0, 0,
  0, 0, 0, 12, 2, 2, 2, 2, 2, 0, 0, 0, 2, 2, 0, 0, 2, 2, 12, 12, 12, 0, 0, 0, 0, 2, 12, 12, 12, 0, 12, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 2, 2, 0, 0, 0, 2, 2, 0, 2, 12, 12, 0, 2, 12, 12, 0, 0, 2, 2, 2, 0, 0, 12, 12, 0, 0, 2, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 12, 12, 2, 12, 12, 0, 0, 12, 12, 0, 0, 2, 12, 12, 12, 0, 2, 12, 12, 0, 0, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 2, 2, 2, 12, 12, 12, 12, 12, 0, 12, 12, 0, 0, 2, 12, 12, 0, 0, 12, 12, 12, 12, 2, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 2, 12, 12, 12, 12, 12, 0, 0, 0, 2, 12, 12, 0, 2, 12, 12, 0, 0, 2, 2, 12, 12, 0, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 2, 12, 12, 0, 0, 2, 2, 0, 0, 2, 12, 12, 0, 0, 12, 12, 2, 2, 2, 12, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 12, 12, 2, 2, 2, 12, 12, 0, 0, 12, 12, 0, 0, 0, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 2, 12, 12, 12, 12, 12, 12, 0, 0, 2, 12, 12, 0, 0, 0, 12, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 2, 12, 12, 12, 12, 0, 0, 0, 0, 2, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 12, 12, 0, 0, 0, 0, 0, 0, 0, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 2, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 2, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
};

static int logo_w = 42, logo_h = 30;

int main(int argc, char **argv) {
  if (argc < 4) {
    fprintf(stderr, "Usage: ./make-gif <time-lapse-file> <output-gif-file> <period in seconds, eg 30>\n");
    return 1;
  }

  int period = atoi(argv[3]);

  FILE *file = fopen(argv[1], "rb");
  unsigned char buffer[11];
  size_t bytesRead = 0;
  double last = 0;

  ge_GIF *gif = ge_new_gif(
    argv[2],
    1000, 1000,
    palette, 5,
    0
  );

  uint8_t *canvas = calloc(1000 * 1000, sizeof(uint8_t));

  for (int y = 0; y < logo_h; y++) {
    for (int x = 0; x < logo_w; x++) {
      canvas[y * 1000 + x] = logo[y * logo_w + x];
    }
  }

  while ((bytesRead = fread(buffer, sizeof(buffer), 1, file)) > 0) {
    uint8_t x = buffer[0];
    uint8_t y = buffer[1];
    uint8_t c = buffer[2];
    double t = *((double*)(buffer + 3));

    for (int y2 = 0; y2 < 10; y2++) {
      for (int x2 = 0; x2 < 10; x2++) {
        canvas[(y * 10 + y2) * 1000 + (x * 10 + x2)] = c;
      }
    }

    if (t - last > 1000.0 * period) {
      memcpy(gif->frame, canvas, 1000 * 1000);
      ge_add_frame(gif, 1);

      printf(".");
      fflush(stdout);

      last = t;
    }
  }

  fclose(file);

  memcpy(gif->frame, canvas, 1000 * 1000);
  ge_add_frame(gif, 1000);
  ge_close_gif(gif);

  return 0;
}