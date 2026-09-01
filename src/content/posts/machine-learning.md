---
title: 'I don''t know: teaching a machine the art of humility'
date: '2026-09-01'
description: Adventures in machine learning
draft: false
tags:
  - experiments
---
We all know LLMs can play fast and loose with the facts on a regular basis. I wanted to know if a neural network could be trained to identify cases where an EMNIST image could not be confidently identified in a classifier network and classify it as "I don't know". Just by adding an extra NA (I don't know) class to the common classes of 0-9, where the NA class comprised of a random sampling of the letters A-Z. And also if it could be useful knowledge for further experimentation in my attempt to more fully understand ML and AI in general.

I started by vibe coding a neural network workbench in Xcode. I must say I'm pretty impressed with the results. I used the ChatGPT Codex extension provided by Apple and OpenAI.  This blog is also vibe coded, otherwise it wouldn't exist. It took a few turns of back and forth, but ultimately it gave me a very workable app to conduct the experimentation.

![Screenshot 2026-09-01 at 1.19.08â¯AM](/blog/images/machine-learning/screenshot-2026-09-01-at-1-19-08-am-532b1e.png)

I started by creating my datasets from the downloadable EMNIST images dataset [EMNIST Images](https://www.kaggle.com/datasets/tomasramos21/emnist-jpeg). Initially, I created a simple training/test set to just identify the common digits 0-9 to validate that my app was in working order and produced usable observations. It turned out pretty well. 
Note: make sure to instruct Codex to utilize the mlx-swift package to take full advantage of Apple Silicon.

![0-9](/blog/images/machine-learning/0-9-7dfd1c.png)

Next, I created another training/test dataset with the added class of "NA" composed of a random sampling of the images A-Z. And it was a complete failure.

![0-9-plus](/blog/images/machine-learning/0-9-plus-ec7f8a.png)

Not to be dismayed, I created yet another training/test dataset with the "NA" class composed of 28x28 pixels of random noise.  And I found that it could indeed identify the digits as digits and noise as noise pretty well.

![0-9-pure-noise](/blog/images/machine-learning/0-9-pure-noise-79a310.png)

But identifying the letters as the distinct "NA" class, with a network with the trained "NA" class as pure noise failed as well.

![0-9-bare-noise](/blog/images/machine-learning/0-9-bare-noise-6f76f6.png)

Next, I created yet another training/test dataset where the classes 0-9 have noise introduced into the training set and the test set as images of the letters A-Z also with noise also introduced. 

![0-9-both-noise](/blog/images/machine-learning/0-9-both-noise-7b95e3.png)

I seemed to get better results when adding random noise into the training and test sets, not perfect, but better. I didn't really much play around other than adding the number of hidden units and found that increasing the training epochs had adverse effects, so the likelihood of overfitting is scant.

Ever my intrepid curiosity, I wanted to see if I could do a little better. I next doubled the number of samples in the A-Z class with added random noise while keeping the 0-9 class number of samples the same.  It did increase the model's humility and in fact made the confidence of known 0-9 classes worse.

![0-9-double-NA](/blog/images/machine-learning/0-9-double-na-7b8810.png)

So I started with the original number of "NA" noise samples and added more little by little (50 at a time) until a more balanced distribution without affecting accuracy on the digits we're interested in too much.  The secret sauce seemed to be about ~15% more samples of the "NA" class than samples of the 0-9 class.

![0-9-less-NA](/blog/images/machine-learning/0-9-less-na-a5a57b.png)

The takeaway is yes, you can introduce uncertainty in the classifier network. Where it is useful will require further exploration, but overall I think this was a successful experiment.

You can find the Neural Network Workbench on GitHub: [EMNIST Excursions](https://github.com/randdvorak/EMNIST-Excursions/tree/main)
