#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
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
  if (argc < 3) {
    fprintf(stderr, "Usage: ./make-gif <time-lapse-file> <output-gif-file>\n");
    return 1;
  }

  FILE *file = fopen(argv[1], "r");

  fseek(file, 0, SEEK_END);
  long count = ftell(file) / sizeof(Update);
  fseek(file, 0, SEEK_SET);

  struct Update *updates = malloc(sizeof(Update) * count);

  fread(updates, sizeof(Update), count, file);

  ge_GIF *gif = ge_new_gif(
    argv[2],
    100, 100,
    palette, 4,
    0
  );

  uint8_t *blank = calloc(100 * 100, 1);

  for (int i = 0; i < count; i++) {
    memcpy(gif->frame, blank, 100 * 100);

    for (int j = 0; j < i; j++) {
      struct Update update = updates[j];
      uint8_t x = update.x;
      uint8_t y = update.y;
      uint8_t c = update.c;
      double t = update.t;
      gif->frame[y * 100 + x] = c;
    }

    ge_add_frame(gif, 1);
  }

  fclose(file);

  ge_close_gif(gif);

  return 0;
}