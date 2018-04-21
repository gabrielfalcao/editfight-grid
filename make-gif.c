#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include "gifenc.h"

typedef struct __attribute__((__packed__)) Update {
  uint8_t x;
  uint8_t y;
  uint8_t c;
  double t;
} Update;

static uint8_t palette[] = {
  0, 0, 0,
  87, 87, 87,
  173, 35, 35,
  42, 75, 215,
  29, 105, 20,
  129, 74, 25,
  129, 38, 192,
  160, 160, 160,
  129, 197, 122,
  157, 175, 255,
  41, 208, 208,
  255, 146, 51,
  255, 238, 51,
  233, 222, 187,
  255, 205, 243,
  255, 255, 255,
};

int main(int argc, char **argv) {
  if (argc < 4) {
    fprintf(stderr, "Usage: ./make-gif <time-lapse-file> <output-gif-file> <period in seconds, eg 30>\n");
    return 1;
  }

  int period = atoi(argv[3]);

  struct stat st;
  stat(argv[1], &st);
  off_t count = st.st_size / sizeof(Update);

  FILE *file = fopen(argv[1], "r");
  Update *updates = malloc(st.st_size);
  size_t numread = fread(updates, sizeof(Update), count, file);
  fclose(file);

  ge_GIF *gif = ge_new_gif(
    argv[2],
    1000, 1000,
    palette, 4,
    0
  );

  uint8_t *canvas = calloc(1000 * 1000, sizeof(uint8_t));

  double last = 0;

  for (int i = 0; i < count; i++) {
    Update update = updates[i];
    uint8_t x = update.x;
    uint8_t y = update.y;
    uint8_t c = update.c;
    double t = update.t;

    for (int y2 = 0; y2 < 10; y2++) {
      for (int x2 = 0; x2 < 10; x2++) {
        canvas[(y * 10 + y2) * 1000 + (x * 10 + x2)] = c;
      }
    }

    if (i == count - 1 || t - last > 1000.0 * period) {
      memcpy(gif->frame, canvas, 1000 * 1000);
      ge_add_frame(gif, 1);

      printf(".");
      fflush(stdout);

      last = t;
    }
  }

  ge_add_frame(gif, 1000);
  ge_close_gif(gif);

  return 0;
}