# The Seeder
_**In automated labour we trust!**_

# Preparing for a new migration

Before running the uploader script, it's required that you clear out the existing data. Doing so is as easy as:
 - Make sure the `project.graphcool` Schema is updated - run `$ graphcool pull`
 - Go to graph.cool, select Data in the console
 - Delete the following Models:
    - BlackCard
    - WhiteCard
    - CardSet
 - Run `$ graphcool push` from the Project Root
    - You will likely be met by an error stating that the scema is referencing a wrong version.
    - Bump the version in the `project.graphcool` document to the required version
    - Run `$ graphcool push` again
    
